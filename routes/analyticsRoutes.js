const express = require('express');
const router = express.Router();
const {
    getRevenueOverview,
    getRevenueBreakdown,
    getServicesAnalytics,
    getClinicPerformance,
    getPatientBillingHistory
} = require('../controllers/analyticsController');

// Middleware to verify authentication
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    next();
};

// Analytics routes
router.get('/analytics/revenue/:doctor_id', authenticateUser, getRevenueOverview);
router.get('/analytics/revenue/:doctor_id/breakdown', authenticateUser, getRevenueBreakdown);
router.get('/analytics/services/:doctor_id', authenticateUser, getServicesAnalytics);
router.get('/analytics/performance/:doctor_id', authenticateUser, getClinicPerformance);
router.get('/analytics/patient/:doctor_id/:patient_id', authenticateUser, getPatientBillingHistory);

module.exports = router;

