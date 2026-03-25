const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');

router.get('/medicines/doctor/:doctorId', medicineController.getMedicines);
router.post('/medicines/doctor/:doctorId', medicineController.addMedicine);
router.put('/medicines/doctor/:doctorId/:medicineId', medicineController.updateMedicine);
router.delete('/medicines/doctor/:doctorId/:medicineId', medicineController.deleteMedicine);

module.exports = router;
