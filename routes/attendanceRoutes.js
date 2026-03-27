const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

router.get('/attendance/zones/:doctorId', attendanceController.listZones);
router.post('/attendance/zones', attendanceController.upsertZone);
router.delete('/attendance/zones/:doctorId/:clinicId', attendanceController.deleteZone);

router.post('/attendance/check', attendanceController.assistantCheck);
router.get('/attendance/logs/:doctorId', attendanceController.listLogs);

module.exports = router;
