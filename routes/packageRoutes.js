const express = require('express');
const router = express.Router();
const {
    createPackage,
    getPackagesByDoctor,
    getPackageById,
    updatePackage,
    deletePackage,
    assignPackageToPatient,
    getPatientPackages,
    getPatientActivePackages,
    usePackageSession
} = require('../controllers/packageController');

const authenticateUser = (req, res, next) => { next(); };

// Package CRUD
router.post('/packages', authenticateUser, createPackage);
router.get('/packages/doctor/:doctor_id', authenticateUser, getPackagesByDoctor);
router.get('/packages/doctor/:doctor_id/:package_id', authenticateUser, getPackageById);
router.put('/packages/doctor/:doctor_id/:package_id', authenticateUser, updatePackage);
router.delete('/packages/doctor/:doctor_id/:package_id', authenticateUser, deletePackage);

// Patient packages
router.post('/patient-packages', authenticateUser, assignPackageToPatient);
router.get('/patient-packages/patient/:patient_id', authenticateUser, getPatientPackages);
router.get('/patient-packages/patient/:patient_id/active', authenticateUser, getPatientActivePackages);
router.post('/patient-packages/:patient_package_id/use-session', authenticateUser, usePackageSession);

module.exports = router;
