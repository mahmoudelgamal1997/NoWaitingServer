const Patient = require('../models/patient');
const { v4: uuidv4 } = require('uuid');

/**
 * Add a referral to a patient record
 * POST /api/referrals/patient/:patientId
 */
const addReferral = async (req, res) => {
    try {
        const { patientId } = req.params;
        const {
            referral_date,
            from_doctor_name,
            from_doctor_title,
            from_clinic_name,
            from_doctor_phone,
            to_doctor_name,
            to_doctor_title,
            to_clinic_name,
            subject,
            referral_body,
            signature,
            doctor_id
        } = req.body;

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const newReferral = {
            referral_id: uuidv4(),
            referral_date: referral_date || new Date(),
            from_doctor_name: from_doctor_name || '',
            from_doctor_title: from_doctor_title || '',
            from_clinic_name: from_clinic_name || '',
            from_doctor_phone: from_doctor_phone || '',
            to_doctor_name: to_doctor_name || '',
            to_doctor_title: to_doctor_title || '',
            to_clinic_name: to_clinic_name || '',
            subject: subject || '',
            referral_body: referral_body || '',
            signature: signature || '',
            doctor_id: doctor_id || '',
            created_at: new Date()
        };

        if (!patient.referrals) {
            patient.referrals = [];
        }
        patient.referrals.push(newReferral);
        await patient.save();

        res.status(200).json({
            success: true,
            message: 'Referral letter saved successfully',
            referral: newReferral
        });
    } catch (error) {
        console.error('Error adding referral:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all referrals for a patient
 * GET /api/referrals/patient/:patientId
 */
const getPatientReferrals = async (req, res) => {
    try {
        const { patientId } = req.params;

        const patient = await Patient.findById(patientId).select('referrals patient_name patient_phone age');
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        res.status(200).json({
            success: true,
            referrals: patient.referrals || [],
            patient_info: {
                name: patient.patient_name,
                phone: patient.patient_phone,
                age: patient.age
            }
        });
    } catch (error) {
        console.error('Error fetching referrals:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { addReferral, getPatientReferrals };
