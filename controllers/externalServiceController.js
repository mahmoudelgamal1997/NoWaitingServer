const ExternalService = require('../models/externalService');
const ExternalServiceRequest = require('../models/externalServiceRequest');

// ============ SERVICE DEFINITIONS MANAGEMENT ============

// Get all service definitions for a doctor
exports.getServices = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { includeInactive } = req.query;

        const filter = { doctor_id: doctorId };
        if (includeInactive !== 'true') {
            filter.isActive = true;
        }

        const services = await ExternalService.find(filter).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: services
        });
    } catch (error) {
        console.error('Error fetching external services:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching external services',
            error: error.message
        });
    }
};

// Add new service definition
exports.addService = async (req, res) => {
    try {
        const { doctor_id, service_name, provider_name } = req.body;

        if (!doctor_id || !service_name || !provider_name) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id, service_name, and provider_name are required'
            });
        }

        const newService = new ExternalService({
            doctor_id,
            service_name,
            provider_name
        });

        await newService.save();

        res.status(201).json({
            success: true,
            data: newService,
            message: 'External service created successfully'
        });
    } catch (error) {
        console.error('Error creating external service:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating external service',
            error: error.message
        });
    }
};

// Update service definition
exports.updateService = async (req, res) => {
    try {
        const { doctorId, serviceId } = req.params;
        const { service_name, provider_name, isActive } = req.body;

        const service = await ExternalService.findOne({
            doctor_id: doctorId,
            service_id: serviceId
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        if (service_name) service.service_name = service_name;
        if (provider_name) service.provider_name = provider_name;
        if (typeof isActive !== 'undefined') service.isActive = isActive;
        service.updatedAt = Date.now();

        await service.save();

        res.json({
            success: true,
            data: service,
            message: 'Service updated successfully'
        });
    } catch (error) {
        console.error('Error updating external service:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating external service',
            error: error.message
        });
    }
};

// Delete (deactivate) service definition
exports.deleteService = async (req, res) => {
    try {
        const { doctorId, serviceId } = req.params;

        const service = await ExternalService.findOne({
            doctor_id: doctorId,
            service_id: serviceId
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        service.isActive = false;
        service.updatedAt = Date.now();
        await service.save();

        res.json({
            success: true,
            message: 'Service deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting external service:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting external service',
            error: error.message
        });
    }
};

// ============ PATIENT REQUESTS MANAGEMENT ============

// Assign service to patient (create request)
exports.assignRequest = async (req, res) => {
    try {
        const {
            doctor_id,
            patient_id,
            patient_name,
            external_service_id,
            service_name,
            provider_name,
            visit_id
        } = req.body;

        if (!doctor_id || !patient_id || !external_service_id || !service_name || !provider_name) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: doctor_id, patient_id, external_service_id, service_name, provider_name'
            });
        }

        const newRequest = new ExternalServiceRequest({
            doctor_id,
            patient_id,
            patient_name: patient_name || "",
            external_service_id,
            service_name,
            provider_name,
            visit_id: visit_id || "",
            status: 'pending'
        });

        await newRequest.save();

        res.status(201).json({
            success: true,
            data: newRequest,
            message: 'Request assigned successfully'
        });
    } catch (error) {
        console.error('Error assigning request:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning request',
            error: error.message
        });
    }
};

// Get requests for a patient
exports.getPatientRequests = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { doctorId } = req.query;

        const filter = { patient_id: patientId };
        if (doctorId) {
            filter.doctor_id = doctorId;
        }

        const requests = await ExternalServiceRequest.find(filter).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching patient requests:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient requests',
            error: error.message
        });
    }
};

// Toggle request status
exports.toggleRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;

        if (!status || !['pending', 'completed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status required: pending or completed'
            });
        }

        const request = await ExternalServiceRequest.findOne({ request_id: requestId });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        request.status = status;
        request.completedAt = status === 'completed' ? Date.now() : null;
        request.updatedAt = Date.now();

        await request.save();

        res.json({
            success: true,
            data: request,
            message: 'Request status updated successfully'
        });
    } catch (error) {
        console.error('Error toggling request status:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling request status',
            error: error.message
        });
    }
};

// Delete request
exports.deleteRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const result = await ExternalServiceRequest.deleteOne({ request_id: requestId });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        res.json({
            success: true,
            message: 'Request deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting request',
            error: error.message
        });
    }
};

// ============ REPORTS ============

// Get reports (counts by provider and service type)
exports.getReports = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { startDate, endDate, status } = req.query;

        const matchFilter = { doctor_id: doctorId };

        // Date filtering
        if (startDate || endDate) {
            matchFilter.createdAt = {};
            if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
            if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
        }

        // Status filtering
        if (status) {
            matchFilter.status = status;
        }

        // Aggregate by provider
        const byProvider = await ExternalServiceRequest.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: '$provider_name',
                    count: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Aggregate by service type
        const byServiceType = await ExternalServiceRequest.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: '$service_name',
                    count: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Overall stats
        const totalRequests = await ExternalServiceRequest.countDocuments(matchFilter);
        const completedRequests = await ExternalServiceRequest.countDocuments({
            ...matchFilter,
            status: 'completed'
        });
        const pendingRequests = await ExternalServiceRequest.countDocuments({
            ...matchFilter,
            status: 'pending'
        });

        res.json({
            success: true,
            data: {
                overview: {
                    total: totalRequests,
                    completed: completedRequests,
                    pending: pendingRequests
                },
                byProvider: byProvider.map(item => ({
                    provider: item._id,
                    total: item.count,
                    completed: item.completed,
                    pending: item.pending
                })),
                byServiceType: byServiceType.map(item => ({
                    serviceType: item._id,
                    total: item.count,
                    completed: item.completed,
                    pending: item.pending
                }))
            }
        });
    } catch (error) {
        console.error('Error generating reports:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating reports',
            error: error.message
        });
    }
};
