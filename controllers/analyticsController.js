const Billing = require('../models/billing');
const Service = require('../models/service');

// Get revenue overview for a period
const getRevenueOverview = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { startDate, endDate } = req.query;

        if (!doctor_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID is required' 
            });
        }

        // Default to current month if no dates provided
        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const matchStage = {
            doctor_id,
            billingDate: { $gte: start, $lte: end },
            paymentStatus: { $ne: 'cancelled' }
        };

        const result = await Billing.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$paymentStatus', 'refund_due'] },
                                { $multiply: ['$totalAmount', -1] },
                                '$totalAmount'
                            ]
                        }
                    },
                    totalConsultationFees: { $sum: '$consultationFee' },
                    totalServicesRevenue: { $sum: '$servicesTotal' },
                    totalDiscounts: { $sum: { $ifNull: ['$discount.amount', 0] } },
                    totalBillings: { $sum: 1 },
                    totalAmountPaid: { $sum: '$amountPaid' }
                }
            }
        ]);

        // Get consultation type breakdown (كشف vs اعاده كشف)
        const consultationBreakdown = await Billing.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$consultationType',
                    count: { $sum: 1 },
                    revenue: { $sum: '$consultationFee' },
                    totalBillAmount: { $sum: '$totalAmount' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Map to readable format
        const consultationByType = {};
        consultationBreakdown.forEach(item => {
            const type = item._id || 'other';
            consultationByType[type] = {
                count: item.count,
                consultationRevenue: item.revenue,
                totalBillAmount: item.totalBillAmount
            };
        });

        const overview = result[0] || {
            totalRevenue: 0,
            totalConsultationFees: 0,
            totalServicesRevenue: 0,
            totalDiscounts: 0,
            totalBillings: 0,
            totalAmountPaid: 0
        };

        // Add calculated fields
        overview.averageBillValue = overview.totalBillings > 0 
            ? Math.round(overview.totalRevenue / overview.totalBillings * 100) / 100 
            : 0;
        overview.pendingAmount = overview.totalRevenue - overview.totalAmountPaid;

        res.status(200).json({
            success: true,
            message: 'Revenue overview retrieved successfully',
            data: {
                ...overview,
                // Breakdown by consultation type (كشف, اعاده كشف, etc.)
                consultationByType,
                period: {
                    startDate: start,
                    endDate: end
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving revenue overview:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving revenue overview',
            error: error.message
        });
    }
};

// Get revenue breakdown by day/week/month
const getRevenueBreakdown = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { startDate, endDate, groupBy = 'day' } = req.query;

        if (!doctor_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID is required' 
            });
        }

        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        let dateFormat;
        switch (groupBy) {
            case 'week':
                dateFormat = { $isoWeek: '$billingDate' };
                break;
            case 'month':
                dateFormat = { $month: '$billingDate' };
                break;
            case 'day':
            default:
                dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$billingDate' } };
        }

        const result = await Billing.aggregate([
            {
                $match: {
                    doctor_id,
                    billingDate: { $gte: start, $lte: end },
                    paymentStatus: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: dateFormat,
                    revenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$paymentStatus', 'refund_due'] },
                                { $multiply: ['$totalAmount', -1] },
                                '$totalAmount'
                            ]
                        }
                    },
                    consultationFees: { $sum: '$consultationFee' },
                    servicesRevenue: { $sum: '$servicesTotal' },
                    discounts: { $sum: { $ifNull: ['$discount.amount', 0] } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            message: 'Revenue breakdown retrieved successfully',
            data: {
                breakdown: result,
                groupBy,
                period: {
                    startDate: start,
                    endDate: end
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving revenue breakdown:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving revenue breakdown',
            error: error.message
        });
    }
};

// Get services analytics
const getServicesAnalytics = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { startDate, endDate } = req.query;

        if (!doctor_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID is required' 
            });
        }

        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const result = await Billing.aggregate([
            {
                $match: {
                    doctor_id,
                    billingDate: { $gte: start, $lte: end },
                    paymentStatus: { $ne: 'cancelled' }
                }
            },
            { $unwind: '$services' },
            {
                $group: {
                    _id: {
                        service_id: '$services.service_id',
                        service_name: '$services.service_name'
                    },
                    totalPatients: { $sum: 1 },
                    totalQuantity: { $sum: '$services.quantity' },
                    totalRevenue: { $sum: '$services.subtotal' }
                }
            },
            {
                $project: {
                    _id: 0,
                    service_id: '$_id.service_id',
                    service_name: '$_id.service_name',
                    totalPatients: 1,
                    totalQuantity: 1,
                    totalRevenue: 1,
                    averageRevenuePerPatient: {
                        $round: [{ $divide: ['$totalRevenue', '$totalPatients'] }, 2]
                    }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Get service details for additional info
        const services = await Service.find({ doctor_id, isActive: true });
        const serviceMap = new Map(services.map(s => [s.service_id, s]));

        // Enrich results with service details
        const enrichedResults = result.map(r => {
            const service = serviceMap.get(r.service_id);
            return {
                ...r,
                category: service?.category || 'unknown',
                currentPrice: service?.price || 0
            };
        });

        res.status(200).json({
            success: true,
            message: 'Services analytics retrieved successfully',
            data: {
                services: enrichedResults,
                period: {
                    startDate: start,
                    endDate: end
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving services analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving services analytics',
            error: error.message
        });
    }
};

// Get clinic performance metrics
const getClinicPerformance = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { startDate, endDate } = req.query;

        if (!doctor_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID is required' 
            });
        }

        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const matchStage = {
            doctor_id,
            billingDate: { $gte: start, $lte: end },
            paymentStatus: { $ne: 'cancelled' }
        };

        // Overall metrics
        const overallResult = await Billing.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalVisits: { $sum: 1 },
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$paymentStatus', 'refund_due'] },
                                { $multiply: ['$totalAmount', -1] },
                                '$totalAmount'
                            ]
                        }
                    },
                    totalConsultationFees: { $sum: '$consultationFee' },
                    totalServicesRevenue: { $sum: '$servicesTotal' },
                    totalDiscounts: { $sum: { $ifNull: ['$discount.amount', 0] } },
                    uniquePatients: { $addToSet: '$patient_id' }
                }
            }
        ]);

        // Most used services
        const mostUsedServices = await Billing.aggregate([
            { $match: matchStage },
            { $unwind: '$services' },
            {
                $group: {
                    _id: {
                        service_id: '$services.service_id',
                        service_name: '$services.service_name'
                    },
                    usageCount: { $sum: '$services.quantity' },
                    revenue: { $sum: '$services.subtotal' }
                }
            },
            { $sort: { usageCount: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    service_id: '$_id.service_id',
                    service_name: '$_id.service_name',
                    usageCount: 1,
                    revenue: 1
                }
            }
        ]);

        // Least used services (excluding zero usage)
        const leastUsedServices = await Billing.aggregate([
            { $match: matchStage },
            { $unwind: '$services' },
            {
                $group: {
                    _id: {
                        service_id: '$services.service_id',
                        service_name: '$services.service_name'
                    },
                    usageCount: { $sum: '$services.quantity' },
                    revenue: { $sum: '$services.subtotal' }
                }
            },
            { $sort: { usageCount: 1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    service_id: '$_id.service_id',
                    service_name: '$_id.service_name',
                    usageCount: 1,
                    revenue: 1
                }
            }
        ]);

        // Consultation type breakdown
        const consultationTypes = await Billing.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$consultationType',
                    count: { $sum: 1 },
                    revenue: { $sum: '$consultationFee' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Payment method breakdown
        const paymentMethods = await Billing.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    amount: { $sum: '$totalAmount' }
                }
            },
            { $sort: { amount: -1 } }
        ]);

        const overall = overallResult[0] || {
            totalVisits: 0,
            totalRevenue: 0,
            totalConsultationFees: 0,
            totalServicesRevenue: 0,
            totalDiscounts: 0,
            uniquePatients: []
        };

        res.status(200).json({
            success: true,
            message: 'Clinic performance metrics retrieved successfully',
            data: {
                overview: {
                    totalVisits: overall.totalVisits,
                    totalRevenue: overall.totalRevenue,
                    totalConsultationFees: overall.totalConsultationFees,
                    totalServicesRevenue: overall.totalServicesRevenue,
                    totalDiscounts: overall.totalDiscounts,
                    uniquePatientCount: overall.uniquePatients.length,
                    averageBillValue: overall.totalVisits > 0 
                        ? Math.round(overall.totalRevenue / overall.totalVisits * 100) / 100 
                        : 0
                },
                mostUsedServices,
                leastUsedServices,
                consultationTypes: consultationTypes.map(ct => ({
                    type: ct._id || 'Unknown',
                    count: ct.count,
                    revenue: ct.revenue
                })),
                paymentMethods: paymentMethods.map(pm => ({
                    method: pm._id || 'Unknown',
                    count: pm.count,
                    amount: pm.amount
                })),
                period: {
                    startDate: start,
                    endDate: end
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving clinic performance:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving clinic performance',
            error: error.message
        });
    }
};

// Get patient billing history
const getPatientBillingHistory = async (req, res) => {
    try {
        const { doctor_id, patient_id } = req.params;

        if (!doctor_id || !patient_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID and Patient ID are required' 
            });
        }

        const billings = await Billing.find({ doctor_id, patient_id })
            .sort({ billingDate: -1 });

        const totalSpent = billings.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalDiscounts = billings.reduce((sum, b) => sum + (b.discount?.amount || 0), 0);

        res.status(200).json({
            success: true,
            message: 'Patient billing history retrieved successfully',
            data: {
                billings,
                summary: {
                    totalVisits: billings.length,
                    totalSpent,
                    totalDiscounts,
                    averageBillValue: billings.length > 0 
                        ? Math.round(totalSpent / billings.length * 100) / 100 
                        : 0
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving patient billing history:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patient billing history',
            error: error.message
        });
    }
};

module.exports = {
    getRevenueOverview,
    getRevenueBreakdown,
    getServicesAnalytics,
    getClinicPerformance,
    getPatientBillingHistory
};

