const express = require('express');
const router = express.Router();
const {
    createBilling,
    getBillings,
    getBilling,
    getBillingByVisit,
    updateBilling,
    deleteBilling
} = require('../controllers/billingController');

// Middleware to verify authentication
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    next();
};

// Billing routes
router.post('/billing', authenticateUser, createBilling);
router.get('/billing/doctor/:doctor_id', authenticateUser, getBillings);
router.get('/billing/doctor/:doctor_id/:billing_id', authenticateUser, getBilling);
router.get('/billing/visit/:visit_id', authenticateUser, getBillingByVisit);
router.put('/billing/doctor/:doctor_id/:billing_id', authenticateUser, updateBilling);
router.delete('/billing/doctor/:doctor_id/:billing_id', authenticateUser, deleteBilling);

module.exports = router;

