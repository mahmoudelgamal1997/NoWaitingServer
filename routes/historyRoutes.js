const express = require('express');
const router = express.Router();
const {
    getAllHistory,
    getHistorySummary,
    getAllVisits
} = require('../controllers/historyController');

// Middleware to verify authentication - example (implement your actual auth middleware)
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    // Example: verify token, get user data
    // If authenticated, add user info to req object
    // req.user = { _id: 'user_id', role: 'doctor', doctor_id: 'doctor_id' };
    next();
};

// History routes
// GET /api/history - Get all history with pagination
router.get('/history', authenticateUser, getAllHistory);

// GET /api/history/summary - Get history summary/statistics
router.get('/history/summary', authenticateUser, getHistorySummary);

// GET /api/history/visits - Get all visits across all patients with pagination
router.get('/history/visits', authenticateUser, getAllVisits);

module.exports = router;

