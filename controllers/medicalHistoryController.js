const HistoryTemplate = require('../models/HistoryTemplate');
const PatientMedicalHistory = require('../models/PatientMedicalHistory');
const defaultTemplate = require('../config/defaultHistoryTemplate');

/**
 * Get or create template for a doctor
 * If no template exists, return the default template
 */
const getTemplate = async (req, res) => {
    try {
        const { doctor_id } = req.query;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        // Try to find existing template
        let template = await HistoryTemplate.findOne({ doctor_id });

        if (!template) {
            // Return default template (not saved yet)
            return res.status(200).json({
                success: true,
                message: 'Default template retrieved',
                data: {
                    ...defaultTemplate,
                    doctor_id,
                    is_default: true,
                    _isNew: true
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Template retrieved successfully',
            data: template
        });
    } catch (error) {
        console.error('Error getting template:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving template',
            error: error.message
        });
    }
};

/**
 * Save or update template for a doctor
 */
const saveTemplate = async (req, res) => {
    try {
        const { doctor_id, template_name, sections } = req.body;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        if (!sections || !Array.isArray(sections)) {
            return res.status(400).json({
                success: false,
                message: 'sections array is required'
            });
        }

        // Find existing template or create new one
        let template = await HistoryTemplate.findOne({ doctor_id });

        if (template) {
            // Update existing template
            template.template_name = template_name || template.template_name;
            template.sections = sections;
            template.is_default = false;
            await template.save();
        } else {
            // Create new template
            template = new HistoryTemplate({
                doctor_id,
                template_name: template_name || 'Medical History Template',
                sections,
                is_default: false
            });
            await template.save();
        }

        res.status(200).json({
            success: true,
            message: 'Template saved successfully',
            data: template
        });
    } catch (error) {
        console.error('Error saving template:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving template',
            error: error.message
        });
    }
};

/**
 * Get patient medical history
 * Returns the latest history record for pre-filling
 */
const getPatientHistory = async (req, res) => {
    try {
        const { patient_id, doctor_id } = req.query;

        if (!patient_id || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'patient_id and doctor_id are required'
            });
        }

        // Get the latest history record
        const latestHistory = await PatientMedicalHistory
            .findOne({ patient_id, doctor_id })
            .sort({ createdAt: -1 })
            .lean();

        if (!latestHistory) {
            return res.status(200).json({
                success: true,
                message: 'No history found',
                data: null
            });
        }

        res.status(200).json({
            success: true,
            message: 'History retrieved successfully',
            data: latestHistory
        });
    } catch (error) {
        console.error('Error getting patient history:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patient history',
            error: error.message
        });
    }
};

/**
 * Get all history records for a patient (timeline view)
 */
const getPatientHistoryTimeline = async (req, res) => {
    try {
        const { patient_id, doctor_id, page = 1, limit = 10 } = req.query;

        if (!patient_id || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'patient_id and doctor_id are required'
            });
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get all history records, sorted by date (newest first)
        const totalRecords = await PatientMedicalHistory.countDocuments({ patient_id, doctor_id });

        const historyRecords = await PatientMedicalHistory
            .find({ patient_id, doctor_id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalPages = Math.ceil(totalRecords / limitNum);

        res.status(200).json({
            success: true,
            message: 'History timeline retrieved successfully',
            data: historyRecords,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalRecords,
                itemsPerPage: limitNum
            }
        });
    } catch (error) {
        console.error('Error getting patient history timeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patient history timeline',
            error: error.message
        });
    }
};

/**
 * Save patient medical history
 * Always creates a new record (append-only)
 */
const savePatientHistory = async (req, res) => {
    try {
        const { patient_id, doctor_id, patient_name, data, template_snapshot, recorded_by, notes } = req.body;

        if (!patient_id || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'patient_id and doctor_id are required'
            });
        }

        if (!data || typeof data !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'data object is required'
            });
        }

        // Mongoose will automatically convert the plain object to a Map
        // No need to manually create a Map
        const historyRecord = new PatientMedicalHistory({
            patient_id,
            doctor_id,
            patient_name: patient_name || '',
            data,  // Pass plain object, Mongoose handles Map conversion
            template_snapshot,
            recorded_by: recorded_by || '',
            notes: notes || ''
        });

        await historyRecord.save();

        res.status(201).json({
            success: true,
            message: 'History saved successfully',
            data: historyRecord
        });
    } catch (error) {
        console.error('Error saving patient history:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving patient history',
            error: error.message
        });
    }
};

module.exports = {
    getTemplate,
    saveTemplate,
    getPatientHistory,
    getPatientHistoryTimeline,
    savePatientHistory
};
