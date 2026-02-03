const express = require('express');
const router = express.Router();
const { updateDoctorSettings, getDoctorSettings } = require('../controllers/doctorController');

// Middleware to verify authentication - reusing the same one from patientRoutes
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    // For now, we're passing through - you'll want to implement actual auth
    next();
};

// Route to get doctor settings
router.get('/doctors/:doctor_id/settings', authenticateUser, getDoctorSettings);

// Route to update doctor settings
// Route to update doctor settings - supporting both PUT and POST for compatibility
router.put('/doctors/:doctor_id/settings', authenticateUser, updateDoctorSettings);
router.post('/doctors/:doctor_id/settings', authenticateUser, updateDoctorSettings);

module.exports = router;