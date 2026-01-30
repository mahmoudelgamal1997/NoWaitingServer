const Service = require('../models/service');
const { v4: uuidv4 } = require('uuid');

// Create a new service
const createService = async (req, res) => {
    try {
        const { doctor_id, name, name_ar, description, price, category } = req.body;

        // Validate required fields
        if (!doctor_id || !name || price === undefined) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID, service name, and price are required' 
            });
        }

        if (price < 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Price cannot be negative' 
            });
        }

        const service = new Service({
            service_id: uuidv4(),
            doctor_id,
            name,
            name_ar: name_ar || "",
            description: description || "",
            price,
            category: category || "general"
        });

        await service.save();

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: service
        });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating service',
            error: error.message
        });
    }
};

// Get all services for a doctor
const getServices = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { includeInactive } = req.query;

        if (!doctor_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID is required' 
            });
        }

        const query = { doctor_id };
        if (!includeInactive || includeInactive === 'false') {
            query.isActive = true;
        }

        const services = await Service.find(query).sort({ category: 1, name: 1 });

        res.status(200).json({
            success: true,
            message: 'Services retrieved successfully',
            data: services,
            count: services.length
        });
    } catch (error) {
        console.error('Error retrieving services:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving services',
            error: error.message
        });
    }
};

// Get a single service
const getService = async (req, res) => {
    try {
        const { doctor_id, service_id } = req.params;

        if (!doctor_id || !service_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID and Service ID are required' 
            });
        }

        const service = await Service.findOne({ doctor_id, service_id });

        if (!service) {
            return res.status(404).json({ 
                success: false,
                message: 'Service not found' 
            });
        }

        res.status(200).json({
            success: true,
            message: 'Service retrieved successfully',
            data: service
        });
    } catch (error) {
        console.error('Error retrieving service:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving service',
            error: error.message
        });
    }
};

// Update a service
const updateService = async (req, res) => {
    try {
        const { doctor_id, service_id } = req.params;
        const { name, name_ar, description, price, category, isActive } = req.body;

        if (!doctor_id || !service_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID and Service ID are required' 
            });
        }

        const service = await Service.findOne({ doctor_id, service_id });

        if (!service) {
            return res.status(404).json({ 
                success: false,
                message: 'Service not found' 
            });
        }

        // Update fields if provided
        if (name !== undefined) service.name = name;
        if (name_ar !== undefined) service.name_ar = name_ar;
        if (description !== undefined) service.description = description;
        if (price !== undefined) {
            if (price < 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Price cannot be negative' 
                });
            }
            service.price = price;
        }
        if (category !== undefined) service.category = category;
        if (isActive !== undefined) service.isActive = isActive;
        
        service.updatedAt = new Date();

        await service.save();

        res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            data: service
        });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating service',
            error: error.message
        });
    }
};

// Delete a service (soft delete by setting isActive to false)
const deleteService = async (req, res) => {
    try {
        const { doctor_id, service_id } = req.params;
        const { permanent } = req.query;

        if (!doctor_id || !service_id) {
            return res.status(400).json({ 
                success: false,
                message: 'Doctor ID and Service ID are required' 
            });
        }

        const service = await Service.findOne({ doctor_id, service_id });

        if (!service) {
            return res.status(404).json({ 
                success: false,
                message: 'Service not found' 
            });
        }

        if (permanent === 'true') {
            // Hard delete
            await Service.deleteOne({ doctor_id, service_id });
            res.status(200).json({
                success: true,
                message: 'Service permanently deleted'
            });
        } else {
            // Soft delete
            service.isActive = false;
            service.updatedAt = new Date();
            await service.save();
            res.status(200).json({
                success: true,
                message: 'Service deactivated successfully',
                data: service
            });
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting service',
            error: error.message
        });
    }
};

module.exports = {
    createService,
    getServices,
    getService,
    updateService,
    deleteService
};

