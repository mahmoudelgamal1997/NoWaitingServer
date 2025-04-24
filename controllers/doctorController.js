const Doctor = require('../models/doctor');

// Create or update doctor settings
const updateDoctorSettings = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        
        // Validate doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        const {
            receiptHeader,
            receiptFooter,
            clinicName,
            doctorTitle,
            clinicAddress,
            clinicPhone,
            logoUrl
        } = req.body;

        // Find the doctor document or create if it doesn't exist
        let doctor = await Doctor.findOne({ doctor_id });

        if (!doctor) {
            // Create a new doctor record
            doctor = new Doctor({
                doctor_id,
                settings: {
                    receiptHeader: receiptHeader !== undefined ? receiptHeader : '',
                    receiptFooter: receiptFooter !== undefined ? receiptFooter : '',
                    clinicName: clinicName !== undefined ? clinicName : '',
                    doctorTitle: doctorTitle !== undefined ? doctorTitle : '',
                    clinicAddress: clinicAddress !== undefined ? clinicAddress : '',
                    clinicPhone: clinicPhone !== undefined ? clinicPhone : '',
                    logoUrl: logoUrl !== undefined ? logoUrl : ''
                },
                updatedAt: new Date()
            });
            await doctor.save();
        } else {
            // Update existing doctor settings
            // Important: use checking against undefined, not the || operator
            // This allows empty strings to be set intentionally
            doctor.settings = {
                receiptHeader: receiptHeader !== undefined ? receiptHeader : doctor.settings.receiptHeader,
                receiptFooter: receiptFooter !== undefined ? receiptFooter : doctor.settings.receiptFooter,
                clinicName: clinicName !== undefined ? clinicName : doctor.settings.clinicName,
                doctorTitle: doctorTitle !== undefined ? doctorTitle : doctor.settings.doctorTitle,
                clinicAddress: clinicAddress !== undefined ? clinicAddress : doctor.settings.clinicAddress,
                clinicPhone: clinicPhone !== undefined ? clinicPhone : doctor.settings.clinicPhone,
                logoUrl: logoUrl !== undefined ? logoUrl : doctor.settings.logoUrl
            };
            doctor.updatedAt = new Date();
            await doctor.save();
        }

        res.status(200).json({
            message: 'Doctor settings updated successfully',
            settings: doctor.settings
        });
    } catch (error) {
        console.error('Error updating doctor settings:', error);
        res.status(500).json({
            message: 'Error updating doctor settings',
            error: error.message
        });
    }
};

// Get doctor settings
const getDoctorSettings = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        
        // Validate doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // Find the doctor
        const doctor = await Doctor.findOne({ doctor_id });

        if (!doctor) {
            return res.status(404).json({ 
                message: 'Doctor settings not found',
                // Return default empty settings so frontend doesn't break
                settings: {
                    receiptHeader: "",
                    receiptFooter: "",
                    clinicName: "",
                    doctorTitle: "",
                    clinicAddress: "",
                    clinicPhone: "",
                    logoUrl: ""
                }
            });
        }

        res.status(200).json({
            message: 'Doctor settings retrieved successfully',
            settings: doctor.settings
        });
    } catch (error) {
        console.error('Error retrieving doctor settings:', error);
        res.status(500).json({
            message: 'Error retrieving doctor settings',
            error: error.message
        });
    }
};

module.exports = { updateDoctorSettings, getDoctorSettings };