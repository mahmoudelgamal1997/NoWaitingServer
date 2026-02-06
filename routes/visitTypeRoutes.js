const express = require('express');
const router = express.Router();
const visitTypeController = require('../controllers/visitTypeController');

// Get visit type configuration for a doctor
router.get('/:doctor_id', visitTypeController.getVisitTypeConfiguration);

// Save/update visit type configuration
router.post('/:doctor_id', visitTypeController.saveVisitTypeConfiguration);

// Calculate price for visit type + urgency
router.get('/:doctor_id/calculate-price', visitTypeController.calculatePrice);

module.exports = router;
