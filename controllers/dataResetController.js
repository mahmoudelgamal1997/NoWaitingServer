const Patient = require('../models/patient');
const Billing = require('../models/billing');
const Inventory = require('../models/inventory');
const InventoryUsage = require('../models/inventoryUsage');
const Service = require('../models/service');

/**
 * Reset all operational data for a specific doctor
 * Removes: patients, billing records, reports, inventory usage, services
 * Preserves: doctor profile, clinic data
 */
exports.resetDoctorData = async (req, res) => {
    try {
        const { doctor_id, clinic_id } = req.body;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        // Log the reset request
        console.log(`[DATA RESET] Starting data reset for doctor: ${doctor_id}, clinic: ${clinic_id || 'all'}`);

        const deletionResults = {
            patients: 0,
            billing: 0,
            inventoryUsage: 0,
            services: 0
        };

        // 1. Delete all patients for this doctor
        const patientDeletion = await Patient.deleteMany({ doctor_id });
        deletionResults.patients = patientDeletion.deletedCount;
        console.log(`[DATA RESET] Deleted ${deletionResults.patients} patients`);

        // 2. Delete all billing records for this doctor
        const billingDeletion = await Billing.deleteMany({ doctor_id });
        deletionResults.billing = billingDeletion.deletedCount;
        console.log(`[DATA RESET] Deleted ${deletionResults.billing} billing records`);

        // 3. Delete all inventory usage records for this doctor's patients
        // First get all patient_ids that belonged to this doctor (already deleted, so we can't query them)
        // Instead, we'll delete inventory usage by inventory items that belong to this doctor
        const doctorInventory = await Inventory.find({ doctor_id }).select('_id');
        const inventoryIds = doctorInventory.map(inv => inv._id);

        if (inventoryIds.length > 0) {
            const inventoryUsageDeletion = await InventoryUsage.deleteMany({
                inventory_id: { $in: inventoryIds }
            });
            deletionResults.inventoryUsage = inventoryUsageDeletion.deletedCount;
            console.log(`[DATA RESET] Deleted ${deletionResults.inventoryUsage} inventory usage records`);
        }

        // 4. Delete all services for this doctor
        const serviceDeletion = await Service.deleteMany({ doctor_id });
        deletionResults.services = serviceDeletion.deletedCount;
        console.log(`[DATA RESET] Deleted ${deletionResults.services} services`);

        // Note: We do NOT delete:
        // - Doctor profile (from Doctor model)
        // - Clinic data
        // - Inventory items (only usage records)
        // - Doctor settings

        console.log(`[DATA RESET] Completed data reset for doctor: ${doctor_id}`);

        return res.status(200).json({
            success: true,
            message: 'Doctor data successfully reset',
            details: {
                doctor_id,
                clinic_id: clinic_id || 'all',
                deletedRecords: deletionResults,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[DATA RESET] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error resetting doctor data',
            error: error.message
        });
    }
};

/**
 * Get preview of data to be deleted (for confirmation UI)
 */
exports.getResetDataPreview = async (req, res) => {
    try {
        const { doctor_id } = req.params;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        // Count all data that will be deleted
        const patientsCount = await Patient.countDocuments({ doctor_id });
        const billingCount = await Billing.countDocuments({ doctor_id });
        const servicesCount = await Service.countDocuments({ doctor_id });

        // Count inventory usage
        const doctorInventory = await Inventory.find({ doctor_id }).select('_id');
        const inventoryIds = doctorInventory.map(inv => inv._id);
        const inventoryUsageCount = inventoryIds.length > 0
            ? await InventoryUsage.countDocuments({ inventory_id: { $in: inventoryIds } })
            : 0;

        // Get total revenue (for information purposes)
        const billingData = await Billing.find({ doctor_id }).select('totalAmount');
        const totalRevenue = billingData.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);

        return res.status(200).json({
            success: true,
            preview: {
                doctor_id,
                patientsCount,
                billingCount,
                servicesCount,
                inventoryUsageCount,
                totalRevenue,
                inventoryItemsCount: doctorInventory.length,
                note: 'Inventory items themselves will NOT be deleted, only usage records'
            }
        });

    } catch (error) {
        console.error('[DATA RESET PREVIEW] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting reset preview',
            error: error.message
        });
    }
};
