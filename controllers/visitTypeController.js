const VisitTypeConfiguration = require('../models/VisitTypeConfiguration');

// Default visit types configuration
const DEFAULT_VISIT_TYPES = [
    {
        type_id: 'visit',
        name: 'Visit',
        name_ar: 'كشف',
        normal_price: 500,
        urgent_price: 700,
        is_active: true,
        order: 1
    },
    {
        type_id: 'revisit',
        name: 'Re-visit',
        name_ar: 'إعادة',
        normal_price: 200,
        urgent_price: 300,
        is_active: true,
        order: 2
    },
    {
        type_id: 'other',
        name: 'Other',
        name_ar: 'أخرى',
        normal_price: 0,
        urgent_price: 0,
        is_active: true,
        order: 3
    }
];

/**
 * Get visit type configuration for a doctor
 * Returns default if none exists
 */
const getVisitTypeConfiguration = async (req, res) => {
    try {
        const { doctor_id } = req.params;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        let config = await VisitTypeConfiguration.findOne({ doctor_id });

        if (!config) {
            // Return default configuration
            return res.status(200).json({
                success: true,
                message: 'Default configuration returned',
                data: {
                    doctor_id,
                    visit_types: DEFAULT_VISIT_TYPES,
                    default_type: 'visit',
                    isDefault: true
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Configuration retrieved successfully',
            data: config
        });
    } catch (error) {
        console.error('Error getting visit type configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving configuration',
            error: error.message
        });
    }
};

/**
 * Save or update visit type configuration
 */
const saveVisitTypeConfiguration = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { visit_types, default_type, clinic_id } = req.body;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        if (!visit_types || !Array.isArray(visit_types)) {
            return res.status(400).json({
                success: false,
                message: 'visit_types array is required'
            });
        }

        // Find existing configuration or create new
        let config = await VisitTypeConfiguration.findOne({ doctor_id });

        if (config) {
            // Update existing
            config.visit_types = visit_types;
            config.default_type = default_type || config.default_type;
            config.clinic_id = clinic_id || config.clinic_id;
            config.updatedAt = Date.now();
            await config.save();
        } else {
            // Create new
            config = new VisitTypeConfiguration({
                doctor_id,
                visit_types,
                default_type: default_type || 'visit',
                clinic_id: clinic_id || ''
            });
            await config.save();
        }

        res.status(200).json({
            success: true,
            message: 'Configuration saved successfully',
            data: config
        });
    } catch (error) {
        console.error('Error saving visit type configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving configuration',
            error: error.message
        });
    }
};

/**
 * Calculate price for a specific visit type and urgency
 */
const calculatePrice = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { visit_type, visit_urgency } = req.query;

        if (!doctor_id || !visit_type) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id and visit_type are required'
            });
        }

        // Get configuration
        let config = await VisitTypeConfiguration.findOne({ doctor_id });

        // Use default if no config exists
        const visitTypes = config ? config.visit_types : DEFAULT_VISIT_TYPES;

        // Find the visit type
        const typeConfig = visitTypes.find(vt => vt.type_id === visit_type || vt.name_ar === visit_type);

        if (!typeConfig) {
            return res.status(404).json({
                success: false,
                message: 'Visit type not found'
            });
        }

        const price = visit_urgency === 'urgent' ? typeConfig.urgent_price : typeConfig.normal_price;

        res.status(200).json({
            success: true,
            data: {
                visit_type: typeConfig.type_id,
                visit_urgency: visit_urgency || 'normal',
                price
            }
        });
    } catch (error) {
        console.error('Error calculating price:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating price',
            error: error.message
        });
    }
};

module.exports = {
    getVisitTypeConfiguration,
    saveVisitTypeConfiguration,
    calculatePrice
};
