const Patient = require('../models/patient');
const { v4: uuidv4 } = require('uuid');

const addMedicalReport = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { diagnosis, medical_report, signature, doctor_id, doctor_name } = req.body;

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const newReport = {
            report_id: uuidv4(),
            diagnosis: diagnosis || '',
            medical_report: medical_report || '',
            signature: signature || '',
            doctor_id: doctor_id || '',
            doctor_name: doctor_name || '',
            date: new Date()
        };

        if (!patient.medical_reports) {
            patient.medical_reports = [];
        }
        patient.medical_reports.push(newReport);
        await patient.save();

        res.status(200).json({
            success: true,
            message: 'Medical report added successfully',
            report: newReport
        });
    } catch (error) {
        console.error('Error adding medical report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPatientMedicalReports = async (req, res) => {
    try {
        const { patientId } = req.params;

        const patient = await Patient.findById(patientId).select('medical_reports patient_name patient_phone age');
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        res.status(200).json({
            success: true,
            medical_reports: patient.medical_reports || [],
            patient_info: {
                name: patient.patient_name,
                phone: patient.patient_phone,
                age: patient.age
            }
        });
    } catch (error) {
        console.error('Error fetching medical reports:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { addMedicalReport, getPatientMedicalReports };
