const express = require('express');
const router = express.Router();
const {
    getPatientProfile,
    getPatientVisits,
    getPatientReceipts,
    getPatientVisitDates,
    getPatientAllData
} = require('../controllers/mobileUserController');

// Middleware to verify authentication - implement your actual auth middleware
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    // Example: verify token, get user data
    // If authenticated, add user info to req object
    // req.user = { _id: 'user_id', role: 'patient', patient_id: 'patient_id' };
    next();
};

// Mobile user routes
// GET /api/mobile/profile - Get patient profile
router.get('/mobile/profile', authenticateUser, getPatientProfile);

// GET /api/mobile/visits - Get all patient visits
router.get('/mobile/visits', authenticateUser, getPatientVisits);

// GET /api/mobile/receipts - Get all patient receipts
router.get('/mobile/receipts', authenticateUser, getPatientReceipts);

// GET /api/mobile/visit-dates - Get patient visit dates
router.get('/mobile/visit-dates', authenticateUser, getPatientVisitDates);

// GET /api/mobile/all-data - Get all patient data (profile, visits, receipts) in one response
router.get('/mobile/all-data', authenticateUser, getPatientAllData);

module.exports = router;

