const Billing = require('../models/billing');
const Patient = require('../models/patient');
const { v4: uuidv4 } = require('uuid');

// Create a new billing record
const createBilling = async (req, res) => {
    try {
        const {
            doctor_id,
            patient_id,
            patient_name,
            patient_phone,
            visit_id,
            clinic_id,
            consultationFee,
            consultationType,
            services, // Array of { service_id, service_name, price, quantity }
            discount, // { type: 'fixed' | 'percentage', value: number, reason?: string }
            paymentStatus,
            paymentMethod,
            amountPaid,
            notes,
            billingDate,
            billing_id: providedBillingId // Optional, e.g. for discount/refund to match Firestore
        } = req.body;

        // Validate required fields
        if (!doctor_id || !patient_id || !patient_name) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID, Patient ID, and Patient Name are required' 
            });
        }

        // Calculate services total
        const processedServices = (services || []).map(s => ({
            service_id: s.service_id,
            service_name: s.service_name,
            price: s.price,
            quantity: s.quantity || 1,
            subtotal: s.price * (s.quantity || 1)
        }));

        const servicesTotal = processedServices.reduce((sum, s) => sum + s.subtotal, 0);
        const subtotal = (consultationFee || 0) + servicesTotal;

        // Calculate discount
        let discountData = null;
        let discountAmount = 0;
        
        if (discount && discount.type && discount.value > 0) {
            if (discount.type === 'percentage') {
                discountAmount = (subtotal * discount.value) / 100;
            } else if (discount.type === 'fixed') {
                discountAmount = Math.min(discount.value, subtotal); // Cannot discount more than subtotal
            }
            discountData = {
                type: discount.type,
                value: discount.value,
                amount: discountAmount,
                reason: discount.reason || ""
            };
        }

        const totalAmount = Math.max(0, subtotal - discountAmount);

        const billing = new Billing({
            billing_id: providedBillingId || uuidv4(),
            doctor_id,
            patient_id,
            patient_name,
            patient_phone: patient_phone || "",
            visit_id: visit_id || "",
            clinic_id: clinic_id || "",
            consultationFee: consultationFee || 0,
            consultationType: consultationType || "كشف",
            services: processedServices,
            servicesTotal,
            subtotal,
            discount: discountData,
            totalAmount,
            paymentStatus: paymentStatus || 'paid',
            paymentMethod: paymentMethod || 'cash',
            amountPaid: amountPaid !== undefined ? amountPaid : totalAmount,
            notes: notes || "",
            billingDate: billingDate ? new Date(billingDate) : new Date()
        });

        await billing.save();

        // If visit_id is provided, update the patient's visit with billing_id
        if (visit_id) {
            await Patient.updateOne(
                { 
                    patient_id, 
                    doctor_id,
                    'visits.visit_id': visit_id 
                },
                { 
                    $set: { 'visits.$.billing_id': billing.billing_id } 
                }
            );
        }

        res.status(201).json({
            success: true,
            message: 'Billing record created successfully',
            data: billing
        });
    } catch (error) {
        console.error('Error creating billing:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating billing record',
            error: error.message
        });
    }
};

// Get billing records for a doctor
const getBillings = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { 
            startDate, 
            endDate, 
            patient_id, 
            paymentStatus,
            page = 1,
            limit = 50
        } = req.query;

        if (!doctor_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID is required' 
            });
        }

        const query = { doctor_id };

        // Date filter
        if (startDate || endDate) {
            query.billingDate = {};
            if (startDate) {
                query.billingDate.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.billingDate.$lte = end;
            }
        }

        // Patient filter
        if (patient_id) {
            query.patient_id = patient_id;
        }

        // Payment status filter
        if (paymentStatus) {
            query.paymentStatus = paymentStatus;
        }

        const skip = (page - 1) * limit;

        const [billings, total] = await Promise.all([
            Billing.find(query)
                .sort({ billingDate: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Billing.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            message: 'Billing records retrieved successfully',
            data: billings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error retrieving billings:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving billing records',
            error: error.message
        });
    }
};

// Get a single billing record
const getBilling = async (req, res) => {
    try {
        const { doctor_id, billing_id } = req.params;

        if (!doctor_id || !billing_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID and Billing ID are required' 
            });
        }

        const billing = await Billing.findOne({ doctor_id, billing_id });

        if (!billing) {
            return res.status(404).json({ 
                success: false,
                message: 'Billing record not found' 
            });
        }

        res.status(200).json({
            success: true,
            message: 'Billing record retrieved successfully',
            data: billing
        });
    } catch (error) {
        console.error('Error retrieving billing:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving billing record',
            error: error.message
        });
    }
};

// Get billing by visit_id
const getBillingByVisit = async (req, res) => {
    try {
        const { visit_id } = req.params;

        if (!visit_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Visit ID is required' 
            });
        }

        const billing = await Billing.findOne({ visit_id });

        if (!billing) {
            return res.status(404).json({ 
                success: false,
                message: 'Billing record not found for this visit' 
            });
        }

        res.status(200).json({
            success: true,
            message: 'Billing record retrieved successfully',
            data: billing
        });
    } catch (error) {
        console.error('Error retrieving billing by visit:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving billing record',
            error: error.message
        });
    }
};

// Update a billing record
const updateBilling = async (req, res) => {
    try {
        const { doctor_id, billing_id } = req.params;
        const {
            consultationFee,
            consultationType,
            services,
            discount,
            paymentStatus,
            paymentMethod,
            amountPaid,
            notes
        } = req.body;

        if (!doctor_id || !billing_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID and Billing ID are required' 
            });
        }

        const billing = await Billing.findOne({ doctor_id, billing_id });

        if (!billing) {
            return res.status(404).json({ 
                success: false,
                message: 'Billing record not found' 
            });
        }

        // Update fields and recalculate totals
        if (consultationFee !== undefined) billing.consultationFee = consultationFee;
        if (consultationType !== undefined) billing.consultationType = consultationType;
        
        if (services !== undefined) {
            billing.services = services.map(s => ({
                service_id: s.service_id,
                service_name: s.service_name,
                price: s.price,
                quantity: s.quantity || 1,
                subtotal: s.price * (s.quantity || 1)
            }));
            billing.servicesTotal = billing.services.reduce((sum, s) => sum + s.subtotal, 0);
        }

        billing.subtotal = billing.consultationFee + billing.servicesTotal;

        if (discount !== undefined) {
            if (discount && discount.type && discount.value > 0) {
                let discountAmount = 0;
                if (discount.type === 'percentage') {
                    discountAmount = (billing.subtotal * discount.value) / 100;
                } else if (discount.type === 'fixed') {
                    discountAmount = Math.min(discount.value, billing.subtotal);
                }
                billing.discount = {
                    type: discount.type,
                    value: discount.value,
                    amount: discountAmount,
                    reason: discount.reason || ""
                };
            } else {
                billing.discount = null;
            }
        }

        billing.totalAmount = Math.max(0, billing.subtotal - (billing.discount?.amount || 0));

        if (paymentStatus !== undefined) billing.paymentStatus = paymentStatus;
        if (paymentMethod !== undefined) billing.paymentMethod = paymentMethod;
        if (amountPaid !== undefined) billing.amountPaid = amountPaid;
        if (notes !== undefined) billing.notes = notes;

        billing.updatedAt = new Date();

        await billing.save();

        res.status(200).json({
            success: true,
            message: 'Billing record updated successfully',
            data: billing
        });
    } catch (error) {
        console.error('Error updating billing:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating billing record',
            error: error.message
        });
    }
};

// Delete a billing record
const deleteBilling = async (req, res) => {
    try {
        const { doctor_id, billing_id } = req.params;

        if (!doctor_id || !billing_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID and Billing ID are required' 
            });
        }

        const billing = await Billing.findOne({ doctor_id, billing_id });

        if (!billing) {
            return res.status(404).json({ 
                success: false,
                message: 'Billing record not found' 
            });
        }

        // If linked to a visit, remove the billing_id reference
        if (billing.visit_id) {
            await Patient.updateOne(
                { 
                    patient_id: billing.patient_id, 
                    doctor_id,
                    'visits.visit_id': billing.visit_id 
                },
                { 
                    $set: { 'visits.$.billing_id': '' } 
                }
            );
        }

        await Billing.deleteOne({ doctor_id, billing_id });

        res.status(200).json({
            success: true,
            message: 'Billing record deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting billing:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting billing record',
            error: error.message
        });
    }
};

// Quick record consultation fee - called when patient joins waiting list
// This creates a simple billing record with just consultation fee (no services)
const recordConsultation = async (req, res) => {
    try {
        const {
            doctor_id,
            patient_id,
            patient_name,
            patient_phone,
            clinic_id,
            consultationType,  // 'كشف' or 'اعاده كشف'
            consultationFee,
            paymentMethod
        } = req.body;

        // Validate required fields
        if (!doctor_id || !patient_id || !patient_name) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID, Patient ID, and Patient Name are required' 
            });
        }

        if (!consultationFee || consultationFee <= 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Consultation fee is required and must be greater than 0' 
            });
        }

        const billing = new Billing({
            billing_id: uuidv4(),
            doctor_id,
            patient_id,
            patient_name,
            patient_phone: patient_phone || "",
            clinic_id: clinic_id || "",
            consultationFee: consultationFee,
            consultationType: consultationType || "كشف",
            services: [],  // No services for quick consultation
            servicesTotal: 0,
            subtotal: consultationFee,
            discount: null,
            totalAmount: consultationFee,
            paymentStatus: 'paid',  // Consultation is paid upfront
            paymentMethod: paymentMethod || 'cash',
            amountPaid: consultationFee,
            notes: "Consultation fee recorded on patient arrival",
            billingDate: new Date()
        });

        await billing.save();

        res.status(201).json({
            success: true,
            message: 'Consultation recorded successfully',
            data: billing
        });
    } catch (error) {
        console.error('Error recording consultation:', error);
        res.status(500).json({
            success: false,
            message: 'Error recording consultation',
            error: error.message
        });
    }
};

module.exports = {
    createBilling,
    getBillings,
    getBilling,
    getBillingByVisit,
    updateBilling,
    deleteBilling,
    recordConsultation
};

