const express = require('express');
const router = express.Router();
const { addReferral, getPatientReferrals } = require('../controllers/referralController');

router.post('/referrals/patient/:patientId', addReferral);
router.get('/referrals/patient/:patientId', getPatientReferrals);

module.exports = router;
