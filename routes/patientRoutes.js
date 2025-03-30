const express = require('express');
const router = express.Router();
const { savePatient, getAllPatients, getPatientsByDoctor, updatePatient } = require('../controllers/patientController');

// Middleware to verify authentication - example (implement your actual auth middleware)
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    // Example: verify token, get user data
    // If authenticated, add user info to req object
    // req.user = { _id: 'user_id', role: 'doctor', doctor_id: 'doctor_id' };
    next();
};

// Route to save patient data
router.post('/patients', authenticateUser, savePatient);

// Route to get patients for a specific doctor (secure route)
router.get('/patients/doctor/:doctor_id', authenticateUser, getPatientsByDoctor);

// Route to get all patients (admin only)
router.get('/patients', authenticateUser, getAllPatients);

// Route to update a patient report (add receipt)
router.put('/patients/:id', authenticateUser, updatePatient);

module.exports = router;