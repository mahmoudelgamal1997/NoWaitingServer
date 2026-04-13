const express = require('express');
const router = express.Router();
const {
    createCompany,
    getCompanies,
    updateCompany,
    deleteCompany,
    getMonthlyReport,
    getAnalytics
} = require('../controllers/insuranceController');

const authenticateUser = (req, res, next) => next();

// Insurance company CRUD
router.post('/companies', authenticateUser, createCompany);
router.get('/companies/doctor/:doctor_id', authenticateUser, getCompanies);
router.put('/companies/doctor/:doctor_id/:company_id', authenticateUser, updateCompany);
router.delete('/companies/doctor/:doctor_id/:company_id', authenticateUser, deleteCompany);

// Reports & analytics
router.get('/report/doctor/:doctor_id', authenticateUser, getMonthlyReport);
router.get('/analytics/doctor/:doctor_id', authenticateUser, getAnalytics);

module.exports = router;
