const express = require('express');
const router = express.Router();
const { 
    savePatient, 
    getAllPatients, 
    getPatientsByDoctor 
} = require('../controllers/patientController');
const { 
    createPatientVisit, 
    getPatientVisitHistory, 
    updatePatientVisit 
} = require('../controllers/visitController');

// Middleware to verify authentication - example (implement your actual auth middleware)
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    // Example: verify token, get user data
    // If authenticated, add user info to req object
    // req.user = { _id: 'user_id', role: 'doctor', doctor_id: 'doctor_id' };
    next();
};

// Existing patient routes
router.post('/patients', authenticateUser, savePatient);
router.get('/patients/doctor/:doctor_id', authenticateUser, getPatientsByDoctor);
router.get('/patients', authenticateUser, getAllPatients);

// New visit-related routes
// Create a new visit for a patient
router.post('/patients/visits', authenticateUser, createPatientVisit);

// Get patient visit history
router.get('/patients/visits', authenticateUser, getPatientVisitHistory);

// Update a specific visit
router.put('/patients/:patient_id/visits/:visit_id', authenticateUser, updatePatientVisit);

module.exports = router;