const Patient = require('../models/patient');
const { v4: uuidv4 } = require('uuid');

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
            visit_id,
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

        // Find the patient
        const patient = await Patient.findOne({ patient_id, doctor_id });
        
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Sort visits by date in descending order (most recent first)
        const sortedVisits = [...patient.visits].sort((a, b) => {
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
            visits: paginatedVisits
        });
    } catch (error) {
        console.error('Error retrieving patient visit history:', error);
        res.status(500).json({
            message: 'Error retrieving patient visit history',
            error: error.message
        });
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

module.exports = { 
    createPatientVisit, 
    getPatientVisitHistory, 
    updatePatientVisit 
};