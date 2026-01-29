const Patient = require('../models/patient');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/reports');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Upload patient report/image
 * Supports single or multiple file uploads
 */
const uploadPatientReport = async (req, res) => {
    try {
        // Multer parses form fields into req.body
        const patient_id = req.body.patient_id;
        const patient_phone = req.body.patient_phone;
        const doctor_id = req.body.doctor_id;
        const report_type = req.body.report_type; // Optional, defaults to 'report'
        const description = req.body.description || '';
        const uploaded_by = req.body.uploaded_by || '';
        
        console.log('Upload request body:', req.body);
        console.log('Upload files:', req.files);

        // Validate required fields
        if (!patient_id && !patient_phone) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or patient_phone is required'
            });
        }

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        // Get files from request (multer handles this)
        const files = req.files || (req.file ? [req.file] : []);
        
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        // Find patient by phone or ID
        let patient = await Patient.findOne({
            doctor_id,
            $or: [
                { patient_id: patient_id || '' },
                { patient_phone: patient_phone || '' }
            ]
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Process uploaded files
        const uploadedReports = files.map(file => {
            // Create public URL for the uploaded file
            const imageUrl = `/uploads/reports/${file.filename}`;
            
            return {
                report_id: uuidv4(),
                image_url: imageUrl,
                report_type: report_type || 'report', // Default to 'report' if not provided
                description: description || '',
                uploaded_by: uploaded_by || '',
                uploaded_at: new Date()
            };
        });

        console.log(`Processing ${uploadedReports.length} report(s) for patient ${patient_id || patient_phone}`);

        // Add reports to patient
        if (!patient.reports) {
            patient.reports = [];
        }
        patient.reports.push(...uploadedReports);

        await patient.save();

        res.status(200).json({
            success: true,
            message: `${uploadedReports.length} report(s) uploaded successfully`,
            reports: uploadedReports,
            patient: {
                patient_id: patient.patient_id,
                patient_name: patient.patient_name,
                patient_phone: patient.patient_phone,
                total_reports: patient.reports.length
            }
        });
    } catch (error) {
        console.error('Error uploading report:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error uploading report',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get patient reports
 */
const getPatientReports = async (req, res) => {
    try {
        const { patient_id, patient_phone, doctor_id } = req.query;

        if (!patient_id && !patient_phone) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or patient_phone is required'
            });
        }

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        const patient = await Patient.findOne({
            doctor_id,
            $or: [
                { patient_id: patient_id || '' },
                { patient_phone: patient_phone || '' }
            ]
        }).select('reports patient_id patient_name patient_phone');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Sort reports by upload date (newest first)
        const sortedReports = (patient.reports || []).sort((a, b) => {
            return new Date(b.uploaded_at) - new Date(a.uploaded_at);
        });

        res.status(200).json({
            success: true,
            message: 'Reports retrieved successfully',
            data: sortedReports,
            total: sortedReports.length,
            patient: {
                patient_id: patient.patient_id,
                patient_name: patient.patient_name,
                patient_phone: patient.patient_phone
            }
        });
    } catch (error) {
        console.error('Error retrieving reports:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving reports',
            error: error.message
        });
    }
};

/**
 * Delete a patient report
 */
const deletePatientReport = async (req, res) => {
    try {
        const { patient_id, patient_phone, doctor_id } = req.query;
        const { report_id } = req.params;

        if (!patient_id && !patient_phone) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or patient_phone is required'
            });
        }

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        const patient = await Patient.findOne({
            doctor_id,
            $or: [
                { patient_id: patient_id || '' },
                { patient_phone: patient_phone || '' }
            ]
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Find and remove the report
        const reportIndex = patient.reports.findIndex(r => r.report_id === report_id);
        
        if (reportIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        const report = patient.reports[reportIndex];
        
        // Delete the file from filesystem
        if (report.image_url) {
            const filePath = path.join(__dirname, '..', report.image_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Remove report from array
        patient.reports.splice(reportIndex, 1);
        await patient.save();

        res.status(200).json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting report',
            error: error.message
        });
    }
};

module.exports = {
    uploadPatientReport,
    getPatientReports,
    deletePatientReport
};

