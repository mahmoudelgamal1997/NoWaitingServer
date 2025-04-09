const Patient = require('../models/patient');

// Save patient data - now with doctor_id
const savePatient = async (req, res) => {
    try {
        const {
            patient_name,
            patient_phone,
            patient_id,
            doctor_id, // This is important - identifies which doctor the patient belongs to
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
            receipt
        } = req.body;

        // Validation for required doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // Check if patient with same patient_id and doctor_id already exists
        const existingPatient = await Patient.findOne({ 
            patient_id, 
            doctor_id 
        });

        if (existingPatient) {
            return res.status(400).json({ 
                message: 'Patient with this ID already exists for this doctor' 
            });
        }

        const newPatient = new Patient({
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
            receipt,
            visits: [] // Explicitly set empty visits array
        });

        await newPatient.save();

        res.status(201).json({ 
            message: 'Patient saved successfully', 
            patient: newPatient 
        });
    } catch (error) {
        console.error('Error saving patient:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'A patient with this ID already exists',
                error: error.message
            });
        }
        
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

// Update patient receipt - check doctor_id first
const updatePatient = async (req, res) => {
    try {
        const patientId = req.params.id;
        const { doctor_id } = req.query; // Get doctor_id from query params for verification
        const {
            drugModel,
            drugs,
            notes
        } = req.body;

        // Find the patient first to verify doctor_id
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Check if the patient belongs to the doctor making the request
        if (doctor_id && patient.doctor_id !== doctor_id) {
            return res.status(403).json({ message: 'Not authorized to update this patient' });
        }

        // Prepare the receipt object
        const newReceipt = {
            drugs: drugs || [],
            notes: notes || "",
            drugModel: drugModel || "new",
            date: new Date()
        };

        // Create a receipt string for backward compatibility
        const receiptString = drugs ? drugs.map(drug =>
            `الدواء: ${drug.drug} | التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}`
        ).join(' || ') : '';

        // Update the patient
        const updatedPatient = await Patient.findByIdAndUpdate(
            patientId,
            {
                $push: { receipts: newReceipt },
                $set: { receipt: receiptString }
            },
            { new: true } // Return the updated document
        );

        res.status(200).json({
            message: 'Patient receipt updated successfully',
            patient: updatedPatient
        });
    } catch (error) {
        console.error('Error updating patient receipt:', error);
        res.status(500).json({
            message: 'Error updating patient receipt',
            error: error.message
        });
    }
};

module.exports = { savePatient, getAllPatients, getPatientsByDoctor, updatePatient };