const Patient = require('../models/patient');
const { v4: uuidv4 } = require('uuid');

// Save patient data or add a new visit if patient already exists
const savePatient = async (req, res) => {
    try {
        const {
            patient_name,
            patient_phone,
            patient_id,
            doctor_id,
            doctor_name,
            date,
            time,
            status,
            position,
            fcmToken,
            token,
            age,
            address,
            visit_type,
            complaint = "", // Added for initial visit
            diagnosis = ""  // Added for initial visit
        } = req.body;

        
        // Validation for required doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // Check if patient with same phone number and doctor_id already exists
        let existingPatient = await Patient.findOne({ 
            patient_phone, 
            doctor_id 
        });

        if (existingPatient) {
            // Generate a unique visit ID
            const visit_id = uuidv4();

            // Create a new visit record for the existing patient
            const newVisit = {
                visit_id,
                date: date || new Date(),
                time: time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                visit_type: visit_type || "كشف",
                complaint,
                diagnosis,
                receipts: []
            };

            // Add the new visit to the patient's visits array
            existingPatient.visits.push(newVisit);
            
            // Update patient status and position if provided
            if (status) existingPatient.status = status;
            if (position) existingPatient.position = position;
            
            // Update other patient info if provided (might have changed)
            if (patient_name) existingPatient.patient_name = patient_name;
            if (age) existingPatient.age = age;
            if (address) existingPatient.address = address;
            if (fcmToken) existingPatient.fcmToken = fcmToken;
            if (token) existingPatient.token = token;

            await existingPatient.save();

            return res.status(200).json({
                message: 'New visit added for existing patient',
                patient: existingPatient,
                visit: newVisit
            });
        }

        // If patient doesn't exist, create a new patient
        const newPatient = new Patient({
            patient_name,
            patient_phone,
            patient_id: patient_id || uuidv4(), // Generate patient_id if not provided
            doctor_id,
            doctor_name,
            date,
            time,
            status,
            position,
            fcmToken,
            token,
            age,
            address,
            visit_type,
            visits: [{
                visit_id: uuidv4(),
                date: date || new Date(),
                time: time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                visit_type: visit_type || "كشف",
                complaint,
                diagnosis,
                receipts: []
            }]
        });

        await newPatient.save();

        res.status(201).json({ 
            message: 'New patient created successfully', 
            patient: newPatient 
        });
    } catch (error) {
        console.error('Error saving patient:', error);
        
        res.status(500).json({ 
            message: 'Error saving patient', 
            error: error.message 
        });
    }
};

// Get patients for a specific doctor
const getPatientsByDoctor = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        
        // Validate doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // Find patients belonging to this doctor
        const patients = await Patient.find({ doctor_id });
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving patients', error: error.message });
    }
};

// Get all patients (admin only route)
const getAllPatients = async (req, res) => {
    try {
        // This could be protected with admin middleware
        const patients = await Patient.find();
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving patients', error: error.message });
    }
};

// Update patient receipt - now updates the most recent visit's receipts
// In your updatePatient controller
// Update the updatePatient function in patientController.js
const updatePatient = async (req, res) => {
    try {
        const patientId = req.params.id;
        const { doctor_id } = req.query;
        const {
            drugModel,
            drugs,
            notes,
            visit_id,
            complaint,
            diagnosis
        } = req.body;

        // Find the patient
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Check authorization
        if (doctor_id && patient.doctor_id !== doctor_id) {
            return res.status(403).json({ message: 'Not authorized to update this patient' });
        }

        // Prepare the receipt
        const newReceipt = {
            drugs: drugs || [],
            notes: notes || "",
            drugModel: drugModel || "new",
            date: new Date()
        };

        let visitIndex = -1;
        
        // Find which visit to update - with improved visit finding logic
        if (visit_id && patient.visits.length > 0) {
            visitIndex = patient.visits.findIndex(v => v.visit_id === visit_id);
            
            if (visitIndex === -1) {
                // If visit not found by ID but was provided, return error
                return res.status(404).json({ message: 'Visit not found' });
            }
        } else if (patient.visits.length > 0) {
            // Use the most recent visit - ONLY if no visit_id was provided
            visitIndex = patient.visits.length - 1;
        } else {
            // Create a new visit ONLY if none exists
            const newVisit = {
                visit_id: uuidv4(),
                date: new Date(),
                time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                visit_type: "كشف",
                complaint: complaint || "",
                diagnosis: diagnosis || "",
                receipts: [newReceipt]
            };
            patient.visits.push(newVisit);
            visitIndex = 0;
        }

        // Update the visit with the new receipt and complaint/diagnosis if provided
        if (visitIndex >= 0) {
            // Only push new receipt if there are drugs to add
            if (drugs && drugs.length > 0) {
                patient.visits[visitIndex].receipts.push(newReceipt);
            
                // Update receipt string for backward compatibility
                const receiptString = drugs.map(drug =>
                    `الدواء: ${drug.drug} | التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}`
                ).join(' || ');
                patient.receipt = receiptString;
            }
            
            // Update complaint and diagnosis if provided
            if (complaint !== undefined) {
                patient.visits[visitIndex].complaint = complaint;
            }
            
            if (diagnosis !== undefined) {
                patient.visits[visitIndex].diagnosis = diagnosis;
            }
        }

        await patient.save();

        res.status(200).json({
            message: 'Patient updated successfully',
            patient: patient
        });
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({
            message: 'Error updating patient',
            error: error.message
        });
    }
};

// Get a specific patient by ID or phone
const getPatientByIdOrPhone = async (req, res) => {
    try {
        const { identifier, doctor_id } = req.params;
        
        // Validate doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // Check if the identifier is a phone number or patient ID
        const patient = await Patient.findOne({
            $and: [
                { doctor_id },
                { $or: [{ patient_phone: identifier }, { patient_id: identifier }] }
            ]
        });
        
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        res.status(200).json({
            message: 'Patient found',
            patient
        });
    } catch (error) {
        console.error('Error retrieving patient:', error);
        res.status(500).json({
            message: 'Error retrieving patient',
            error: error.message
        });
    }
};

module.exports = { 
    savePatient, 
    getAllPatients, 
    getPatientsByDoctor, 
    updatePatient,
    getPatientByIdOrPhone
};