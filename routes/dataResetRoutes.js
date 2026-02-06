const express = require('express');
const router = express.Router();
const dataResetController = require('../controllers/dataResetController');

// Get preview of data to be deleted (for confirmation)
router.get('/preview/:doctor_id', dataResetController.getResetDataPreview);

// Reset all operational data for a doctor
router.post('/reset', dataResetController.resetDoctorData);

module.exports = router;
