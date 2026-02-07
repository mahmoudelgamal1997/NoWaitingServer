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
            logoUrl,
            consultationFee,
            revisitFee,
            estisharaFee,
            printSettings
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
                    logoUrl: logoUrl !== undefined ? logoUrl : '',
                    consultationFee: consultationFee !== undefined ? consultationFee : 0,
                    revisitFee: revisitFee !== undefined ? revisitFee : 0,
                    estisharaFee: estisharaFee !== undefined ? estisharaFee : 0,
                    printSettings: printSettings || {
                        paperSize: 'a4',
                        marginTop: 0,
                        showHeader: true,
                        showFooter: true,
                        showPatientInfo: true
                    }
                },
                updatedAt: new Date()
            });
            await doctor.save();
        } else {
            // Update existing doctor settings
            // Important: use checking against undefined, not the || operator
            // This allows empty strings and 0 values to be set intentionally
            doctor.settings = {
                receiptHeader: receiptHeader !== undefined ? receiptHeader : doctor.settings.receiptHeader,
                receiptFooter: receiptFooter !== undefined ? receiptFooter : doctor.settings.receiptFooter,
                clinicName: clinicName !== undefined ? clinicName : doctor.settings.clinicName,
                doctorTitle: doctorTitle !== undefined ? doctorTitle : doctor.settings.doctorTitle,
                clinicAddress: clinicAddress !== undefined ? clinicAddress : doctor.settings.clinicAddress,
                clinicPhone: clinicPhone !== undefined ? clinicPhone : doctor.settings.clinicPhone,
                logoUrl: logoUrl !== undefined ? logoUrl : doctor.settings.logoUrl,
                consultationFee: consultationFee !== undefined ? consultationFee : (doctor.settings.consultationFee || 0),
                revisitFee: revisitFee !== undefined ? revisitFee : (doctor.settings.revisitFee || 0),
                estisharaFee: estisharaFee !== undefined ? estisharaFee : (doctor.settings.estisharaFee || 0),
                printSettings: printSettings !== undefined ? printSettings : (doctor.settings.printSettings || {
                    paperSize: 'a4',
                    marginTop: 0,
                    showHeader: true,
                    showFooter: true,
                    showPatientInfo: true
                })
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

const getDoctorSettings = async (req, res) => {
    try {
        const { doctor_id } = req.params;

        // Validate doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // Find the doctor
        const doctor = await Doctor.findOne({ doctor_id });

        // Also fetch visit types configuration to include in response
        // This helps frontend apps that expect all configuration in one place
        const VisitTypeConfiguration = require('../models/VisitTypeConfiguration');
        const visitTypeConfig = await VisitTypeConfiguration.findOne({ doctor_id });
        const visitTypes = visitTypeConfig ? visitTypeConfig.visit_types : null;

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
                    logoUrl: "",
                    consultationFee: 0,
                    revisitFee: 0,
                    estisharaFee: 0,
                    printSettings: {
                        paperSize: 'a4',
                        marginTop: 0,
                        showHeader: true,
                        showFooter: true,
                        showPatientInfo: true
                    },
                    visitTypes: visitTypes || [] // Include defaults/found types even if doctor settings missing
                }
            });
        }

        // Convert to plain object to allow adding property
        const settingsObj = doctor.settings.toObject ? doctor.settings.toObject() : doctor.settings;

        res.status(200).json({
            message: 'Doctor settings retrieved successfully',
            settings: {
                ...settingsObj,
                visitTypes: visitTypes || []
            }
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