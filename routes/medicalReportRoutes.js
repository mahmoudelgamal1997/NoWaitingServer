const express = require('express');
const router = express.Router();
const { addMedicalReport, getPatientMedicalReports } = require('../controllers/medicalReportController');

router.post('/medical-reports/patient/:patientId', addMedicalReport);
router.get('/medical-reports/patient/:patientId', getPatientMedicalReports);

module.exports = router;
