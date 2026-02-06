const express = require('express');
const router = express.Router();
const medicalHistoryController = require('../controllers/medicalHistoryController');

// Template routes
router.get('/medical-history/template', medicalHistoryController.getTemplate);
router.post('/medical-history/template', medicalHistoryController.saveTemplate);

// Patient history routes
router.get('/medical-history/patient', medicalHistoryController.getPatientHistory);
router.get('/medical-history/patient/timeline', medicalHistoryController.getPatientHistoryTimeline);
router.post('/medical-history/patient', medicalHistoryController.savePatientHistory);

module.exports = router;
