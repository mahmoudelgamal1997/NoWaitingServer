const PackageModel = require('../models/package');
const PatientPackage = require('../models/patientPackage');
const PackageUsage = require('../models/packageUsage');
const Service = require('../models/service');
const { v4: uuidv4 } = require('uuid');

// ==================== PACKAGE CRUD ====================

const createPackage = async (req, res) => {
    try {
        const { doctor_id, name, service_id, description, expiry_days } = req.body;
        const sessions_count = Number(req.body.sessions_count);
        const price = Number(req.body.price);

        if (!doctor_id || !name || !service_id) {
            return res.status(400).json({
                success: false,
                message: 'Doctor ID, name, and service_id are required'
            });
        }

        if (!Number.isFinite(sessions_count) || sessions_count < 1) {
            return res.status(400).json({
                success: false,
                message: 'sessions_count must be a number and at least 1'
            });
        }

        if (!Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                success: false,
                message: 'price must be a number and 0 or greater'
            });
        }

        const service = await Service.findOne({ doctor_id, service_id });
        if (!service) {
            return res.status(400).json({
                success: false,
                message: 'Service not found or does not belong to this doctor'
            });
        }

        const price_per_session = sessions_count > 0 ? Math.round((price / sessions_count) * 100) / 100 : 0;

        const pkg = new PackageModel({
            package_id: uuidv4(),
            doctor_id,
            name,
            service_id,
            service_name: service.name || '',
            sessions_count,
            price,
            price_per_session,
            description: description || '',
            expiry_days: expiry_days != null ? expiry_days : null,
            isActive: true
        });

        await pkg.save();

        res.status(201).json({
            success: true,
            message: 'Package created successfully',
            data: pkg
        });
    } catch (error) {
        console.error('Error creating package:', error);
        const message = error.message || 'Error creating package';
        const validationMsg = error.errors ? Object.values(error.errors).map(e => e.message).join('; ') : null;
        res.status(500).json({
            success: false,
            message: validationMsg || message,
            error: error.message
        });
    }
};

const getPackagesByDoctor = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { activeOnly } = req.query;

        if (!doctor_id) {
            return res.status(400).json({ success: false, message: 'Doctor ID is required' });
        }

        const query = { doctor_id };
        if (activeOnly === 'true') query.isActive = true;

        const packages = await PackageModel.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: packages,
            count: packages.length
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching packages',
            error: error.message
        });
    }
};

const getPackageById = async (req, res) => {
    try {
        const { doctor_id, package_id } = req.params;
        const pkg = await PackageModel.findOne({ doctor_id, package_id });
        if (!pkg) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }
        res.status(200).json({ success: true, data: pkg });
    } catch (error) {
        console.error('Error fetching package:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching package',
            error: error.message
        });
    }
};

const updatePackage = async (req, res) => {
    try {
        const { doctor_id, package_id } = req.params;
        const { name, sessions_count, price, description, expiry_days, isActive } = req.body;

        const pkg = await PackageModel.findOne({ doctor_id, package_id });
        if (!pkg) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }

        if (name != null) pkg.name = name;
        if (sessions_count != null) {
            if (sessions_count < 1) return res.status(400).json({ success: false, message: 'sessions_count must be at least 1' });
            pkg.sessions_count = sessions_count;
        }
        if (price != null) {
            if (price < 0) return res.status(400).json({ success: false, message: 'price cannot be negative' });
            pkg.price = price;
        }
        if (description != null) pkg.description = description;
        if (expiry_days !== undefined) pkg.expiry_days = expiry_days;
        if (isActive !== undefined) pkg.isActive = !!isActive;

        pkg.price_per_session = pkg.sessions_count > 0 ? Math.round((pkg.price / pkg.sessions_count) * 100) / 100 : 0;
        pkg.updatedAt = new Date();

        await pkg.save();

        res.status(200).json({ success: true, message: 'Package updated', data: pkg });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating package',
            error: error.message
        });
    }
};

const deletePackage = async (req, res) => {
    try {
        const { doctor_id, package_id } = req.params;

        const assigned = await PatientPackage.findOne({ doctor_id, package_id });
        if (assigned) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete package that is assigned to patients. Deactivate it instead.'
            });
        }

        const result = await PackageModel.deleteOne({ doctor_id, package_id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }

        res.status(200).json({ success: true, message: 'Package deleted' });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting package',
            error: error.message
        });
    }
};

// ==================== PATIENT PACKAGES ====================

const assignPackageToPatient = async (req, res) => {
    try {
        const { patient_id, package_id, doctor_id, clinic_id, patient_name } = req.body;

        if (!patient_id || !package_id || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'patient_id, package_id, and doctor_id are required'
            });
        }

        const pkg = await PackageModel.findOne({ doctor_id, package_id });
        if (!pkg || !pkg.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Package not found or inactive'
            });
        }

        let start_date = new Date();
        let expiry_date = null;
        if (pkg.expiry_days != null && pkg.expiry_days > 0) {
            expiry_date = new Date(start_date);
            expiry_date.setDate(expiry_date.getDate() + pkg.expiry_days);
        }

        const patientPackage = new PatientPackage({
            patient_package_id: uuidv4(),
            patient_id,
            package_id,
            doctor_id,
            clinic_id: clinic_id || '',
            total_sessions: pkg.sessions_count,
            remaining_sessions: pkg.sessions_count,
            start_date,
            expiry_date,
            status: 'active',
            package_name: pkg.name,
            service_id: pkg.service_id
        });

        await patientPackage.save();

        // Billing is created when the assistant collects payment in the assistant portal
        // (pending bill → paid), so revenue matches actual collection.

        res.status(201).json({
            success: true,
            message: 'Package assigned to patient',
            data: patientPackage
        });
    } catch (error) {
        console.error('Error assigning package:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning package',
            error: error.message
        });
    }
};

const getPatientPackages = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const { doctor_id, status } = req.query;

        if (!patient_id) {
            return res.status(400).json({ success: false, message: 'patient_id is required' });
        }

        const query = { patient_id };
        if (doctor_id) query.doctor_id = doctor_id;
        if (status) query.status = status;

        const list = await PatientPackage.find(query).sort({ start_date: -1 });

        res.status(200).json({
            success: true,
            data: list,
            count: list.length
        });
    } catch (error) {
        console.error('Error fetching patient packages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient packages',
            error: error.message
        });
    }
};

const getPatientActivePackages = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const { doctor_id } = req.query;

        if (!patient_id) {
            return res.status(400).json({ success: false, message: 'patient_id is required' });
        }

        const query = {
            patient_id,
            status: 'active',
            remaining_sessions: { $gt: 0 }
        };
        if (doctor_id) query.doctor_id = doctor_id;

        const list = await PatientPackage.find(query);
        const now = new Date();
        const active = list.filter(pp => !pp.expiry_date || new Date(pp.expiry_date) >= now);

        res.status(200).json({
            success: true,
            data: active,
            count: active.length
        });
    } catch (error) {
        console.error('Error fetching active patient packages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching active packages',
            error: error.message
        });
    }
};

const usePackageSession = async (req, res) => {
    try {
        const { patient_package_id } = req.params;
        const { visit_id } = req.body || {};

        const patientPackage = await PatientPackage.findOne({ patient_package_id });
        if (!patientPackage) {
            return res.status(404).json({ success: false, message: 'Patient package not found' });
        }

        if (patientPackage.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Package is not active (finished or expired)'
            });
        }

        if (patientPackage.remaining_sessions <= 0) {
            return res.status(400).json({
                success: false,
                message: 'No remaining sessions'
            });
        }

        if (patientPackage.expiry_date && new Date(patientPackage.expiry_date) < new Date()) {
            patientPackage.status = 'expired';
            await patientPackage.save();
            return res.status(400).json({
                success: false,
                message: 'Package has expired'
            });
        }

        patientPackage.remaining_sessions -= 1;
        if (patientPackage.remaining_sessions === 0) {
            patientPackage.status = 'finished';
        }
        patientPackage.updatedAt = new Date();
        await patientPackage.save();

        const usage = new PackageUsage({
            usage_id: uuidv4(),
            patient_package_id,
            visit_id: visit_id || '',
            used_sessions: 1,
            used_at: new Date()
        });
        await usage.save();

        res.status(200).json({
            success: true,
            message: 'Session used',
            data: patientPackage
        });
    } catch (error) {
        console.error('Error using package session:', error);
        res.status(500).json({
            success: false,
            message: 'Error using session',
            error: error.message
        });
    }
};

module.exports = {
    createPackage,
    getPackagesByDoctor,
    getPackageById,
    updatePackage,
    deletePackage,
    assignPackageToPatient,
    getPatientPackages,
    getPatientActivePackages,
    usePackageSession
};
