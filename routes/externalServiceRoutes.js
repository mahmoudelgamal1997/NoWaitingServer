const express = require('express');
const router = express.Router();
const externalServiceController = require('../controllers/externalServiceController');

// ============ SERVICE DEFINITIONS ROUTES ============
// Get all service definitions for a doctor
router.get('/services/doctor/:doctorId', externalServiceController.getServices);

// Add new service definition
router.post('/services', externalServiceController.addService);

// Update service definition
router.put('/services/doctor/:doctorId/:serviceId', externalServiceController.updateService);

// Delete (deactivate) service definition
router.delete('/services/doctor/:doctorId/:serviceId', externalServiceController.deleteService);

// ============ PATIENT REQUESTS ROUTES ============
// Assign service to patient (create request)
router.post('/requests', externalServiceController.assignRequest);

// Get requests for a patient
router.get('/requests/patient/:patientId', externalServiceController.getPatientRequests);

// Toggle request status
router.put('/requests/:requestId/status', externalServiceController.toggleRequestStatus);

// Delete request
router.delete('/requests/:requestId', externalServiceController.deleteRequest);

// ============ REPORTS ROUTES ============
// Get reports for a doctor
router.get('/reports/doctor/:doctorId', externalServiceController.getReports);

module.exports = router;
