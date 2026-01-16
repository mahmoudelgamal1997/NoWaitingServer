const Patient = require('../models/patient');

/**
 * Get patient profile by patient_id or phone number
 * Returns patient information aggregated across all doctors
 */
const getPatientProfile = async (req, res) => {
    try {
        const { patient_id, phone } = req.query;

        // Validate input - require either patient_id or phone
        if (!patient_id && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or phone is required'
            });
        }

        // Build query to find all patient records (across all doctors)
        let query = {};
        if (patient_id) {
            query.patient_id = patient_id;
        } else if (phone) {
            query.patient_phone = phone;
        }

        // Find all patient records across all doctors
        const patientRecords = await Patient.find(query).lean();

        if (!patientRecords || patientRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Aggregate patient data across all doctors
        // Use the most recent record for basic info, but collect all visits
        let aggregatedProfile = {
            patient_id: patientRecords[0].patient_id,
            patient_name: patientRecords[0].patient_name,
            patient_phone: patientRecords[0].patient_phone,
            age: patientRecords[0].age || '',
            address: patientRecords[0].address || '',
            fcmToken: patientRecords[0].fcmToken || '',
            doctors: [], // List of all doctors this patient has visited
            total_visits: 0,
            total_receipts: 0,
            created_at: patientRecords[0].createdAt,
            last_visit_date: null
        };

        // Collect all visits and doctors
        const allVisits = [];
        const doctorsMap = new Map();

        patientRecords.forEach(record => {
            // Track unique doctors
            if (!doctorsMap.has(record.doctor_id)) {
                doctorsMap.set(record.doctor_id, {
                    doctor_id: record.doctor_id,
                    doctor_name: record.doctor_name || ''
                });
            }

            // Collect all visits from this record
            if (record.visits && record.visits.length > 0) {
                record.visits.forEach(visit => {
                    allVisits.push({
                        ...visit,
                        doctor_id: record.doctor_id,
                        doctor_name: record.doctor_name || ''
                    });
                    aggregatedProfile.total_receipts += (visit.receipts || []).length;
                });
            }

            // Update profile info from most recent record
            const recordDate = new Date(record.updatedAt || record.createdAt);
            const currentDate = new Date(aggregatedProfile.created_at || 0);
            if (recordDate > currentDate) {
                if (record.age) aggregatedProfile.age = record.age;
                if (record.address) aggregatedProfile.address = record.address;
                if (record.fcmToken) aggregatedProfile.fcmToken = record.fcmToken;
                aggregatedProfile.created_at = record.createdAt;
            }
        });

        // Sort visits by date (most recent first)
        allVisits.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB.getTime() - dateA.getTime();
        });

        aggregatedProfile.total_visits = allVisits.length;
        aggregatedProfile.doctors = Array.from(doctorsMap.values());
        aggregatedProfile.last_visit_date = allVisits.length > 0 ? allVisits[0].date : null;

        res.status(200).json({
            success: true,
            message: 'Patient profile retrieved successfully',
            data: aggregatedProfile
        });
    } catch (error) {
        console.error('Error retrieving patient profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patient profile',
            error: error.message
        });
    }
};

/**
 * Get all visits for a patient across all doctors
 * Returns paginated list of all visits with receipts
 */
const getPatientVisits = async (req, res) => {
    try {
        const { patient_id, phone } = req.query;
        const {
            page = 1,
            limit = 20,
            startDate,
            endDate,
            doctor_id,
            visit_type,
            sortOrder = 'desc'
        } = req.query;

        // Validate input
        if (!patient_id && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or phone is required'
            });
        }

        // Build query
        let query = {};
        if (patient_id) {
            query.patient_id = patient_id;
        } else if (phone) {
            query.patient_phone = phone;
        }

        // Filter by doctor if specified
        if (doctor_id) {
            query.doctor_id = doctor_id;
        }

        // Find all patient records
        const patientRecords = await Patient.find(query).lean();

        if (!patientRecords || patientRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Collect all visits from all records
        let allVisits = [];
        patientRecords.forEach(record => {
            if (record.visits && record.visits.length > 0) {
                record.visits.forEach(visit => {
                    // Apply date filters
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
                        visit_type: visit.visit_type || '',
                        complaint: visit.complaint || '',
                        diagnosis: visit.diagnosis || '',
                        receipts: visit.receipts || [],
                        receipts_count: (visit.receipts || []).length,
                        doctor_id: record.doctor_id,
                        doctor_name: record.doctor_name || ''
                    });
                });
            }
        });

        // Sort visits
        const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
        allVisits.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return (dateB.getTime() - dateA.getTime()) * sortMultiplier;
        });

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const totalVisits = allVisits.length;
        const skip = (pageNum - 1) * limitNum;
        const paginatedVisits = allVisits.slice(skip, skip + limitNum);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalVisits / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.status(200).json({
            success: true,
            message: 'Patient visits retrieved successfully',
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
                patient_id: patient_id || null,
                phone: phone || null,
                startDate: startDate || null,
                endDate: endDate || null,
                doctor_id: doctor_id || null,
                visit_type: visit_type || null,
                sortOrder: sortOrder
            }
        });
    } catch (error) {
        console.error('Error retrieving patient visits:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patient visits',
            error: error.message
        });
    }
};

/**
 * Get all receipts for a patient across all visits and doctors
 * Returns paginated list of all receipts
 */
const getPatientReceipts = async (req, res) => {
    try {
        const { patient_id, phone } = req.query;
        const {
            page = 1,
            limit = 20,
            startDate,
            endDate,
            doctor_id,
            visit_id,
            sortOrder = 'desc'
        } = req.query;

        // Validate input
        if (!patient_id && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or phone is required'
            });
        }

        // Build query
        let query = {};
        if (patient_id) {
            query.patient_id = patient_id;
        } else if (phone) {
            query.patient_phone = phone;
        }

        // Filter by doctor if specified
        if (doctor_id) {
            query.doctor_id = doctor_id;
        }

        // Find all patient records
        const patientRecords = await Patient.find(query).lean();

        if (!patientRecords || patientRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Collect all receipts from all visits
        let allReceipts = [];
        patientRecords.forEach(record => {
            if (record.visits && record.visits.length > 0) {
                record.visits.forEach(visit => {
                    // Filter by visit_id if specified
                    if (visit_id && visit.visit_id !== visit_id) {
                        return;
                    }

                    // Apply date filters to visit date
                    if (startDate && new Date(visit.date) < new Date(startDate)) {
                        return;
                    }
                    if (endDate && new Date(visit.date) > new Date(endDate)) {
                        return;
                    }

                    // Collect receipts from this visit
                    if (visit.receipts && visit.receipts.length > 0) {
                        visit.receipts.forEach(receipt => {
                            allReceipts.push({
                                receipt_id: receipt._id ? receipt._id.toString() : null,
                                visit_id: visit.visit_id,
                                visit_date: visit.date,
                                visit_time: visit.time,
                                visit_type: visit.visit_type || '',
                                complaint: visit.complaint || '',
                                diagnosis: visit.diagnosis || '',
                                drugs: receipt.drugs || [],
                                notes: receipt.notes || '',
                                date: receipt.date || visit.date,
                                drugModel: receipt.drugModel || 'new',
                                doctor_id: record.doctor_id,
                                doctor_name: record.doctor_name || ''
                            });
                        });
                    }
                });
            }
        });

        // Sort receipts by date
        const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
        allReceipts.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return (dateB.getTime() - dateA.getTime()) * sortMultiplier;
        });

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const totalReceipts = allReceipts.length;
        const skip = (pageNum - 1) * limitNum;
        const paginatedReceipts = allReceipts.slice(skip, skip + limitNum);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalReceipts / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.status(200).json({
            success: true,
            message: 'Patient receipts retrieved successfully',
            data: paginatedReceipts,
            pagination: {
                currentPage: pageNum,
                totalPages: totalPages,
                totalItems: totalReceipts,
                itemsPerPage: limitNum,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage,
                nextPage: hasNextPage ? pageNum + 1 : null,
                prevPage: hasPrevPage ? pageNum - 1 : null
            },
            filters: {
                patient_id: patient_id || null,
                phone: phone || null,
                startDate: startDate || null,
                endDate: endDate || null,
                doctor_id: doctor_id || null,
                visit_id: visit_id || null,
                sortOrder: sortOrder
            }
        });
    } catch (error) {
        console.error('Error retrieving patient receipts:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patient receipts',
            error: error.message
        });
    }
};

/**
 * Get visit dates summary for a patient
 * Returns list of all visit dates grouped by doctor
 */
const getPatientVisitDates = async (req, res) => {
    try {
        const { patient_id, phone } = req.query;
        const { doctor_id, startDate, endDate } = req.query;

        // Validate input
        if (!patient_id && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or phone is required'
            });
        }

        // Build query
        let query = {};
        if (patient_id) {
            query.patient_id = patient_id;
        } else if (phone) {
            query.patient_phone = phone;
        }

        // Filter by doctor if specified
        if (doctor_id) {
            query.doctor_id = doctor_id;
        }

        // Find all patient records
        const patientRecords = await Patient.find(query).lean();

        if (!patientRecords || patientRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Collect all visit dates grouped by doctor
        const visitsByDoctor = {};
        const allVisitDates = [];

        patientRecords.forEach(record => {
            const doctorKey = `${record.doctor_id}|${record.doctor_name || ''}`;
            
            if (!visitsByDoctor[doctorKey]) {
                visitsByDoctor[doctorKey] = {
                    doctor_id: record.doctor_id,
                    doctor_name: record.doctor_name || '',
                    visits: []
                };
            }

            if (record.visits && record.visits.length > 0) {
                record.visits.forEach(visit => {
                    // Apply date filters
                    if (startDate && new Date(visit.date) < new Date(startDate)) {
                        return;
                    }
                    if (endDate && new Date(visit.date) > new Date(endDate)) {
                        return;
                    }

                    const visitDate = {
                        visit_id: visit.visit_id,
                        date: visit.date,
                        time: visit.time,
                        visit_type: visit.visit_type || ''
                    };

                    visitsByDoctor[doctorKey].visits.push(visitDate);
                    allVisitDates.push({
                        ...visitDate,
                        doctor_id: record.doctor_id,
                        doctor_name: record.doctor_name || ''
                    });
                });
            }
        });

        // Sort visits by date (most recent first) for each doctor
        Object.values(visitsByDoctor).forEach(doctorData => {
            doctorData.visits.sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB.getTime() - dateA.getTime();
            });
        });

        // Sort all visit dates
        allVisitDates.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB.getTime() - dateA.getTime();
        });

        res.status(200).json({
            success: true,
            message: 'Patient visit dates retrieved successfully',
            data: {
                visits_by_doctor: Object.values(visitsByDoctor),
                all_visit_dates: allVisitDates,
                total_visits: allVisitDates.length,
                unique_doctors: Object.keys(visitsByDoctor).length
            },
            filters: {
                patient_id: patient_id || null,
                phone: phone || null,
                doctor_id: doctor_id || null,
                startDate: startDate || null,
                endDate: endDate || null
            }
        });
    } catch (error) {
        console.error('Error retrieving patient visit dates:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patient visit dates',
            error: error.message
        });
    }
};

module.exports = {
    getPatientProfile,
    getPatientVisits,
    getPatientReceipts,
    getPatientVisitDates
};

