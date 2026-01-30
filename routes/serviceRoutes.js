const express = require('express');
const router = express.Router();
const {
    createService,
    getServices,
    getService,
    updateService,
    deleteService
} = require('../controllers/serviceController');

// Middleware to verify authentication
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    next();
};

// Service routes
router.post('/services', authenticateUser, createService);
router.get('/services/doctor/:doctor_id', authenticateUser, getServices);
router.get('/services/doctor/:doctor_id/:service_id', authenticateUser, getService);
router.put('/services/doctor/:doctor_id/:service_id', authenticateUser, updateService);
router.delete('/services/doctor/:doctor_id/:service_id', authenticateUser, deleteService);

module.exports = router;

