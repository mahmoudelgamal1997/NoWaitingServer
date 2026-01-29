const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const {
    uploadPatientReport,
    getPatientReports,
    deletePatientReport
} = require('../controllers/reportController');

// Middleware to verify authentication - example (implement your actual auth middleware)
const authenticateUser = (req, res, next) => {
    // Your authentication logic goes here
    // Example: verify token, get user data
    // If authenticated, add user info to req object
    // req.user = { _id: 'user_id', role: 'doctor', doctor_id: 'doctor_id' };
    next();
};

// Upload patient report(s) - supports single or multiple files
// POST /api/patients/reports/upload
// Body: FormData with fields: patient_id (or patient_phone), doctor_id, report_type, description, uploaded_by
// Files: images (single or multiple)
router.post('/patients/reports/upload', authenticateUser, upload.array('images', 10), uploadPatientReport);

// Get patient reports
// GET /api/patients/reports?patient_id=xxx&doctor_id=yyy
// or GET /api/patients/reports?patient_phone=xxx&doctor_id=yyy
router.get('/patients/reports', authenticateUser, getPatientReports);

// Delete a patient report
// DELETE /api/patients/reports/:report_id?patient_id=xxx&doctor_id=yyy
router.delete('/patients/reports/:report_id', authenticateUser, deletePatientReport);

module.exports = router;

