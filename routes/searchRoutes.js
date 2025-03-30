const express = require('express');
const router = express.Router();
const { searchPatients } = require('../controllers/searchController');

// Search and filter patients
router.get('/patients/search', searchPatients);

module.exports = router;
