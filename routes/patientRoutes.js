const express = require('express');
const router = express.Router();
const {
    savePatient,
    getAllPatients,
    getPatientsByDoctor,
    getPatientByIdOrPhone,
    updatePatient,
    updatePatientVisitType
} = require('../controllers/patientController');
const {
    createPatientVisit,
    getPatientVisitHistory,
    updatePatientVisit,
    getVisitDetails,
    deleteVisit
} = require('../controllers/visitController');

// Middleware to verify authentication - example (implement your actual auth middleware)
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    // Example: verify token, get user data
    // If authenticated, add user info to req object
    // req.user = { _id: 'user_id', role: 'doctor', doctor_id: 'doctor_id' };
    next();
};

// Patient routes
router.post('/patients', authenticateUser, savePatient);
router.get('/patients/doctor/:doctor_id', authenticateUser, getPatientsByDoctor);
router.get('/patients', authenticateUser, getAllPatients);
router.get('/patients/:identifier/doctor/:doctor_id', authenticateUser, getPatientByIdOrPhone);
router.put('/patients/:id', authenticateUser, updatePatient);
router.put('/patients/:patient_id/visit-type', authenticateUser, updatePatientVisitType);

// Visit-related routes
router.post('/patients/visits', authenticateUser, createPatientVisit);
router.get('/patients/visits', authenticateUser, getPatientVisitHistory);
router.put('/patients/:patient_id/doctor/:doctor_id/visits/:visit_id', authenticateUser, updatePatientVisit);
router.get('/patients/:patient_id/doctor/:doctor_id/visits/:visit_id', authenticateUser, getVisitDetails);
router.delete('/patients/:patient_id/doctor/:doctor_id/visits/:visit_id', authenticateUser, deleteVisit);

module.exports = router;