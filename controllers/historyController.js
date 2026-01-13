const Patient = require('../models/patient');
const Doctor = require('../models/doctor');

/**
 * Get comprehensive history with pagination
 * Returns all patients, visits, and related data with pagination support
 */
const getAllHistory = async (req, res) => {
    try {
        const {
            doctor_id,
            page = 1,
            limit = 20,
            startDate,
            endDate,
            search,
            sortBy = 'date', // 'date', 'name', 'visitCount'
            sortOrder = 'desc' // 'asc' or 'desc'
        } = req.query;

        // Convert page and limit to numbers
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query
        let query = {};

        // Filter by doctor_id if provided
        if (doctor_id) {
            query.doctor_id = doctor_id;
        }

        // Filter by date range if provided
        if (startDate || endDate) {
            query['visits.date'] = {};
            if (startDate) {
                query['visits.date'].$gte = new Date(startDate);
            }
            if (endDate) {
                query['visits.date'].$lte = new Date(endDate);
            }
        }

        // Search filter (by patient name or phone)
        if (search) {
            query.$or = [
                { patient_name: { $regex: search, $options: 'i' } },
                { patient_phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count for pagination
        const totalPatients = await Patient.countDocuments(query);

        // Build sort object
        let sortObject = {};
        switch (sortBy) {
            case 'name':
                sortObject.patient_name = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'visitCount':
                // This will be handled after fetching
                sortObject.createdAt = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'date':
            default:
                sortObject.createdAt = sortOrder === 'asc' ? 1 : -1;
                break;
        }

        // Fetch patients with pagination
        let patients = await Patient.find(query)
            .sort(sortObject)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Process patients to include visit counts and flatten visits
        const processedData = patients.map(patient => {
            // Sort visits by date (most recent first)
            const sortedVisits = [...(patient.visits || [])].sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB.getTime() - dateA.getTime();
            });

            return {
                patient_id: patient.patient_id,
                patient_name: patient.patient_name,
                patient_phone: patient.patient_phone,
                age: patient.age || '',
                address: patient.address || '',
                doctor_id: patient.doctor_id,
                doctor_name: patient.doctor_name || '',
                status: patient.status || 'WAITING',
                total_visits: sortedVisits.length,
                last_visit_date: sortedVisits.length > 0 ? sortedVisits[0].date : null,
                created_at: patient.createdAt,
                updated_at: patient.updatedAt,
                visits: sortedVisits.map(visit => ({
                    visit_id: visit.visit_id,
                    date: visit.date,
                    time: visit.time,
                    visit_type: visit.visit_type,
                    complaint: visit.complaint || '',
                    diagnosis: visit.diagnosis || '',
                    receipts_count: visit.receipts ? visit.receipts.length : 0,
                    receipts: visit.receipts || []
                }))
            };
        });

        // Sort by visit count if needed
        if (sortBy === 'visitCount') {
            processedData.sort((a, b) => {
                return sortOrder === 'asc' 
                    ? a.total_visits - b.total_visits 
                    : b.total_visits - a.total_visits;
            });
        }

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalPatients / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.status(200).json({
            success: true,
            message: 'History retrieved successfully',
            data: processedData,
            pagination: {
                currentPage: pageNum,
                totalPages: totalPages,
                totalItems: totalPatients,
                itemsPerPage: limitNum,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage,
                nextPage: hasNextPage ? pageNum + 1 : null,
                prevPage: hasPrevPage ? pageNum - 1 : null
            },
            filters: {
                doctor_id: doctor_id || null,
                startDate: startDate || null,
                endDate: endDate || null,
                search: search || null,
                sortBy: sortBy,
                sortOrder: sortOrder
            }
        });
    } catch (error) {
        console.error('Error retrieving history:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving history',
            error: error.message
        });
    }
};

/**
 * Get history summary/statistics
 */
const getHistorySummary = async (req, res) => {
    try {
        const { doctor_id, startDate, endDate } = req.query;

        let query = {};
        if (doctor_id) {
            query.doctor_id = doctor_id;
        }

        // Get all patients matching the query
        const patients = await Patient.find(query).lean();

        // Calculate statistics
        const totalPatients = patients.length;
        let totalVisits = 0;
        let totalReceipts = 0;
        const visitsByType = {};
        const recentVisits = [];

        patients.forEach(patient => {
            const visits = patient.visits || [];
            totalVisits += visits.length;

            visits.forEach(visit => {
                // Count receipts
                totalReceipts += (visit.receipts || []).length;

                // Count by visit type
                const visitType = visit.visit_type || 'كشف';
                visitsByType[visitType] = (visitsByType[visitType] || 0) + 1;

                // Collect recent visits
                if (visit.date) {
                    recentVisits.push({
                        visit_id: visit.visit_id,
                        patient_name: patient.patient_name,
                        patient_phone: patient.patient_phone,
                        date: visit.date,
                        visit_type: visit.visit_type,
                        doctor_id: patient.doctor_id
                    });
                }
            });
        });

        // Sort recent visits by date
        recentVisits.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        res.status(200).json({
            success: true,
            message: 'History summary retrieved successfully',
            summary: {
                totalPatients: totalPatients,
                totalVisits: totalVisits,
                totalReceipts: totalReceipts,
                averageVisitsPerPatient: totalPatients > 0 ? (totalVisits / totalPatients).toFixed(2) : 0,
                visitsByType: visitsByType,
                recentVisits: recentVisits.slice(0, 10) // Last 10 visits
            },
            filters: {
                doctor_id: doctor_id || null,
                startDate: startDate || null,
                endDate: endDate || null
            }
        });
    } catch (error) {
        console.error('Error retrieving history summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving history summary',
            error: error.message
        });
    }
};

/**
 * Get all visits across all patients with pagination
 * Useful for getting a flat list of all visits
 */
const getAllVisits = async (req, res) => {
    try {
        const {
            doctor_id,
            page = 1,
            limit = 20,
            startDate,
            endDate,
            visit_type,
            search
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query
        let query = {};
        if (doctor_id) {
            query.doctor_id = doctor_id;
        }
        if (search) {
            query.$or = [
                { patient_name: { $regex: search, $options: 'i' } },
                { patient_phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Fetch patients
        const patients = await Patient.find(query).lean();

        // Flatten all visits
        let allVisits = [];
        patients.forEach(patient => {
            const visits = patient.visits || [];
            visits.forEach(visit => {
                // Apply date filter
                if (startDate && new Date(visit.date) < new Date(startDate)) {
                    return;
                }
                if (endDate && new Date(visit.date) > new Date(endDate)) {
                    return;
                }
                // Apply visit type filter
                if (visit_type && visit.visit_type !== visit_type) {
                    return;
                }

                allVisits.push({
                    visit_id: visit.visit_id,
                    date: visit.date,
                    time: visit.time,
                    visit_type: visit.visit_type,
                    complaint: visit.complaint || '',
                    diagnosis: visit.diagnosis || '',
                    receipts: visit.receipts || [],
                    patient: {
                        patient_id: patient.patient_id,
                        patient_name: patient.patient_name,
                        patient_phone: patient.patient_phone,
                        age: patient.age || '',
                        address: patient.address || ''
                    },
                    doctor_id: patient.doctor_id,
                    doctor_name: patient.doctor_name || ''
                });
            });
        });

        // Sort by date (most recent first)
        allVisits.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        // Get total count
        const totalVisits = allVisits.length;

        // Apply pagination
        const paginatedVisits = allVisits.slice(skip, skip + limitNum);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalVisits / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.status(200).json({
            success: true,
            message: 'All visits retrieved successfully',
            data: paginatedVisits,
            pagination: {
                currentPage: pageNum,
                totalPages: totalPages,
                totalItems: totalVisits,
                itemsPerPage: limitNum,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage,
                nextPage: hasNextPage ? pageNum + 1 : null,
                prevPage: hasPrevPage ? pageNum - 1 : null
            },
            filters: {
                doctor_id: doctor_id || null,
                startDate: startDate || null,
                endDate: endDate || null,
                visit_type: visit_type || null,
                search: search || null
            }
        });
    } catch (error) {
        console.error('Error retrieving all visits:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving all visits',
            error: error.message
        });
    }
};

module.exports = {
    getAllHistory,
    getHistorySummary,
    getAllVisits
};

