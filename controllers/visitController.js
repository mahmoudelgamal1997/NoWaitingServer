const Patient = require('../models/patient');
const { v4: uuidv4 } = require('uuid');

// Normalize phone: digits only, last 10 digits (shared logic)
function normalizePhone(phone) {
    if (phone == null || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
}

/**
 * Parse clinic scope parameters from a request (query or body).
 * Returns { useClinicScope: boolean, clinicIds: string[] }.
 * When useClinicScope is false, ALL existing code paths remain completely unchanged.
 */
function parseClinicScope(req) {
    const rawScope = req.query.use_clinic_scope || (req.body && req.body.use_clinic_scope);
    const useClinicScope = rawScope === 'true' || rawScope === true;
    if (!useClinicScope) return { useClinicScope: false, clinicIds: [] };

    let clinicIds = [];
    const raw = req.query.clinic_ids || (req.body && req.body.clinic_ids);
    if (Array.isArray(raw)) {
        clinicIds = raw.filter(Boolean);
    } else if (typeof raw === 'string' && raw.trim()) {
        clinicIds = raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    const singleClinicId = req.query.clinic_id || (req.body && req.body.clinic_id);
    if (clinicIds.length === 0 && singleClinicId) {
        clinicIds = [singleClinicId];
    }
    return { useClinicScope: clinicIds.length > 0, clinicIds };
}

// Create a new visit for a patient
const createPatientVisit = async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            visit_type = "كشف",
            complaint = "",
            diagnosis = "",
            drugs = [] // Optional drugs
        } = req.body;

        // Validate required fields
        if (!patient_id || !doctor_id) {
            return res.status(400).json({ message: 'Patient ID and Doctor ID are required' });
        }

        // Find the patient
        const patient = await Patient.findOne({ patient_id, doctor_id });
        
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Validate drugs structure if provided
        if (drugs.length > 0) {
            const invalidDrugs = drugs.filter(drug => 
                !drug.drug || !drug.frequency || !drug.period || !drug.timing
            );
            
            if (invalidDrugs.length > 0) {
                return res.status(400).json({ 
                    message: 'Invalid drug structure',
                    invalidDrugs 
                });
            }
        }

        // Generate a unique visit ID
        const visit_id = uuidv4();

        // Create new visit object
        const newVisit = {
            visit_id, // Add the unique visit_id
            visit_type,
            complaint,
            diagnosis,
            receipts: drugs.length > 0 ? [{
                drugs,
                date: new Date()
            }] : []
        };

        // Add visit to patient's visits array
        patient.visits.push(newVisit);

        // Save the patient with the new visit
        await patient.save();

        res.status(201).json({
            message: 'Visit created successfully',
            visit: {
                visit_id: newVisit.visit_id,
                visit_type: newVisit.visit_type,
                complaint: newVisit.complaint,
                diagnosis: newVisit.diagnosis,
                date: newVisit.date
            },
            patient: {
                patient_name: patient.patient_name,
                patient_phone: patient.patient_phone,
                patient_id: patient.patient_id
            }
        });
    } catch (error) {
        console.error('Error creating patient visit:', error);
        
        // Check for duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'A visit with this ID already exists',
                error: error.message
            });
        }
        
        res.status(500).json({
            message: 'Error creating patient visit',
            error: error.message
        });
    }
};

// Get patient visit history
const getPatientVisitHistory = async (req, res) => {
    try {
        const { 
            patient_id, 
            doctor_id, 
            page = 1, 
            limit = 10 
        } = req.query;

        // Validate required fields
        if (!patient_id || !doctor_id) {
            return res.status(400).json({ message: 'Patient ID and Doctor ID are required' });
        }

        // CLINIC SCOPE: When enabled, find this patient's records across all branches
        // and merge visits from all doctors in the center into one unified history.
        const { useClinicScope: histScope, clinicIds: histClinicIds } = parseClinicScope(req);
        if (histScope) {
            // Find all patient docs that share the same patient_id OR same normalized phone
            // across all specified branch clinic_ids
            const basePatient = await Patient.findOne({ patient_id }).lean();
            const normalizedPhone = basePatient ? basePatient.normalized_phone || normalizePhone(basePatient.patient_phone) : null;

            const orConditions = [{ patient_id }];
            if (normalizedPhone) orConditions.push({ normalized_phone: normalizedPhone });

            const allDocs = await Patient.find({
                clinic_id: { $in: histClinicIds },
                $or: orConditions
            }).lean();

            if (!allDocs || allDocs.length === 0) {
                return res.status(404).json({ message: 'Patient not found' });
            }

            // Use the doc with the file_number as the source for patient_info
            const infoDoc = allDocs.find(d => d.file_number) || allDocs[0];

            // Merge all visits and all_visits across all docs, dedupe by visit_id
            const seen = new Set();
            const sourceVisits = [];
            for (const doc of allDocs) {
                for (const v of [...(doc.all_visits || []), ...(doc.visits || [])]) {
                    const id = v.visit_id || v.billing_id || v._id?.toString?.() || '';
                    if (!id || !seen.has(id)) {
                        if (id) seen.add(id);
                        // Attach doctor info to visit for display purposes
                        sourceVisits.push({ ...v, doctor_id: doc.doctor_id, doctor_name: doc.doctor_name || '' });
                    }
                }
            }

            // Merge complaint_history across all docs, dedupe by _id
            const complaintSeen = new Set();
            const mergedComplaints = [];
            for (const doc of allDocs) {
                for (const c of (doc.complaint_history || [])) {
                    const cid = c._id?.toString?.() || '';
                    if (!cid || !complaintSeen.has(cid)) {
                        if (cid) complaintSeen.add(cid);
                        mergedComplaints.push(c);
                    }
                }
            }

            const sortedVisits = sourceVisits.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            const sortedComplaints = mergedComplaints.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            const pageNum = Number(page);
            const limitNum = Number(limit);
            const startIndex = (pageNum - 1) * limitNum;
            const paginatedVisits = sortedVisits.slice(startIndex, startIndex + limitNum);

            return res.status(200).json({
                message: 'Patient visit history retrieved successfully (clinic scope)',
                patient_info: {
                    name: infoDoc.patient_name,
                    phone: infoDoc.patient_phone,
                    age: infoDoc.age,
                    address: infoDoc.address
                },
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(sortedVisits.length / limitNum),
                    totalVisits: sortedVisits.length
                },
                visits: paginatedVisits,
                complaint_history: sortedComplaints
            });
        }

        // EXISTING PATH: single doctor + patient lookup — unchanged for all current users
        const patient = await Patient.findOne({ patient_id, doctor_id });
        
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Merge visits + all_visits and dedupe by visit_id so we return full history
        const allVisitsArr = patient.all_visits || [];
        const visitsArr = patient.visits || [];
        const seen = new Set();
        const sourceVisits = [];
        for (const v of [...allVisitsArr, ...visitsArr]) {
            const id = v.visit_id || v.billing_id || v._id?.toString?.() || '';
            if (!id || !seen.has(id)) {
                if (id) seen.add(id);
                sourceVisits.push(v);
            }
        }

        // Sort visits by date in descending order (most recent first)
        const sortedVisits = [...sourceVisits].sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB.getTime() - dateA.getTime();
        });

        // Implement pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedVisits = sortedVisits.slice(startIndex, endIndex);

        res.status(200).json({
            message: 'Patient visit history retrieved successfully',
            patient_info: {
                name: patient.patient_name,
                phone: patient.patient_phone,
                age: patient.age,
                address: patient.address
            },
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(sortedVisits.length / limit),
                totalVisits: sortedVisits.length
            },
            visits: paginatedVisits,
            complaint_history: [...(patient.complaint_history || [])].sort((a, b) => new Date(b.date) - new Date(a.date))
        });
    } catch (error) {
        console.error('Error retrieving patient visit history:', error);
        res.status(500).json({
            message: 'Error retrieving patient visit history',
            error: error.message
        });
    }
};

// Add a new complaint/diagnosis entry
const addComplaintHistory = async (req, res) => {
    try {
        const { patient_id, doctor_id, complaint, diagnosis, doctor_name } = req.body;
        if (!patient_id || !doctor_id) {
            return res.status(400).json({ message: 'patient_id and doctor_id are required' });
        }
        const patient = await Patient.findOne({ patient_id, doctor_id });
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        const entry = { date: new Date(), complaint: complaint || '', diagnosis: diagnosis || '', doctor_name: doctor_name || '' };
        patient.complaint_history.push(entry);
        await patient.save();

        res.status(201).json({ message: 'Added', entry: patient.complaint_history[patient.complaint_history.length - 1] });
    } catch (error) {
        console.error('Error adding complaint history:', error);
        res.status(500).json({ message: 'Error adding complaint history', error: error.message });
    }
};

// Update an existing visit
const updatePatientVisit = async (req, res) => {
    try {
        const { patient_id, doctor_id, visit_id } = req.params;
        const { drugs, complaint, diagnosis } = req.body;

        // Find the patient
        const patient = await Patient.findOne({ patient_id, doctor_id });
        
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Find the specific visit
        const visitIndex = patient.visits.findIndex(visit => visit.visit_id === visit_id);
        
        if (visitIndex === -1) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        // Validate drugs structure if provided
        if (drugs && drugs.length > 0) {
            const invalidDrugs = drugs.filter(drug => 
                !drug.drug || !drug.frequency || !drug.period || !drug.timing
            );
            
            if (invalidDrugs.length > 0) {
                return res.status(400).json({ 
                    message: 'Invalid drug structure',
                    invalidDrugs 
                });
            }
        }

        // Update visit details
        if (complaint) patient.visits[visitIndex].complaint = complaint;
        if (diagnosis) patient.visits[visitIndex].diagnosis = diagnosis;

        // Add new drugs to the visit's receipts if provided
        if (drugs && drugs.length > 0) {
            patient.visits[visitIndex].receipts.push({
                drugs,
                date: new Date()
            });
        }

        // Save the patient
        await patient.save();

        res.status(200).json({
            message: 'Visit updated successfully',
            visit: patient.visits[visitIndex]
        });
    } catch (error) {
        console.error('Error updating patient visit:', error);
        res.status(500).json({
            message: 'Error updating patient visit',
            error: error.message
        });
    }
};

// Get a specific visit details
const getVisitDetails = async (req, res) => {
    try {
        const { patient_id, doctor_id, visit_id } = req.params;

        // Validate required fields
        if (!patient_id || !doctor_id || !visit_id) {
            return res.status(400).json({ message: 'Patient ID, Doctor ID, and Visit ID are required' });
        }

        // Find the patient
        const patient = await Patient.findOne({ patient_id, doctor_id });
        
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Find the specific visit
        const visit = patient.visits.find(visit => visit.visit_id === visit_id);
        
        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        res.status(200).json({
            message: 'Visit details retrieved successfully',
            visit: visit,
            patient_info: {
                name: patient.patient_name,
                phone: patient.patient_phone,
                age: patient.age,
                address: patient.address
            }
        });
    } catch (error) {
        console.error('Error retrieving visit details:', error);
        res.status(500).json({
            message: 'Error retrieving visit details',
            error: error.message
        });
    }
};

// Delete a specific visit
const deleteVisit = async (req, res) => {
    try {
        const { patient_id, doctor_id, visit_id } = req.params;

        // Validate required fields
        if (!patient_id || !doctor_id || !visit_id) {
            return res.status(400).json({ message: 'Patient ID, Doctor ID, and Visit ID are required' });
        }

        // Find the patient
        const patient = await Patient.findOne({ patient_id, doctor_id });
        
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Find the index of the specific visit
        const visitIndex = patient.visits.findIndex(visit => visit.visit_id === visit_id);
        
        if (visitIndex === -1) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        // Remove the visit from the visits array
        patient.visits.splice(visitIndex, 1);

        // Save the patient
        await patient.save();

        res.status(200).json({
            message: 'Visit deleted successfully',
            deletedVisitId: visit_id
        });
    } catch (error) {
        console.error('Error deleting visit:', error);
        res.status(500).json({
            message: 'Error deleting visit',
            error: error.message
        });
    }
};

module.exports = { 
    createPatientVisit, 
    getPatientVisitHistory, 
    updatePatientVisit,
    getVisitDetails,
    deleteVisit,
    addComplaintHistory
};