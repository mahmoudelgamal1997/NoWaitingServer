const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
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
        console.log('=== UPLOAD REQUEST RECEIVED ===');
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Request body keys:', Object.keys(req.body || {}));
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Files array:', req.files ? req.files.length : 0);
        console.log('Files:', req.files ? req.files.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })) : 'none');
        
        // Multer parses form fields into req.body
        const patient_id = req.body.patient_id;
        const patient_phone = req.body.patient_phone;
        const doctor_id = req.body.doctor_id;
        const report_type = req.body.report_type; // Optional, defaults to 'report'
        const description = req.body.description || '';
        const uploaded_by = req.body.uploaded_by || '';

        // Validate required fields - only phone is required for patient self-uploads
        if (!patient_id && !patient_phone) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or patient_phone is required'
            });
        }

        // doctor_id is optional - patient can upload without specifying a doctor

        // Get files from request (multer handles this)
        const files = req.files || (req.file ? [req.file] : []);
        
        console.log('Files received:', files.length);
        if (files.length > 0) {
            files.forEach((file, index) => {
                console.log(`File ${index + 1}:`, {
                    originalname: file.originalname,
                    filename: file.filename,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: file.path
                });
            });
        }
        
        if (!files || files.length === 0) {
            console.error('ERROR: No files in request');
            return res.status(400).json({
                success: false,
                message: 'No files uploaded. Please select at least one image.'
            });
        }

        // Find patient by phone or ID
        console.log('Searching for patient:', { doctor_id, patient_id, patient_phone });
        
        // Validate required fields
        if (!patient_phone || patient_phone.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'patient_phone is required'
            });
        }

        if (!doctor_id || doctor_id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        const trimmedPhone = patient_phone.trim();
        const trimmedDoctorId = doctor_id.trim();
        const trimmedPatientId = patient_id ? patient_id.trim() : null;
        
        let patient;
        
        // First try: Find by patient_phone + doctor_id (same as visit logic - primary match)
        patient = await Patient.findOne({
            patient_phone: trimmedPhone,
            doctor_id: trimmedDoctorId
        });

        // Second try: If patient_id provided and not found by phone, try patient_id + doctor_id
        if (!patient && trimmedPatientId) {
            patient = await Patient.findOne({
                patient_id: trimmedPatientId,
                doctor_id: trimmedDoctorId
            });
        }

        // If patient not found, create minimal patient record
        if (!patient) {
            console.log('Patient not found, creating minimal patient record');
            
            // Try to fetch doctor name from Doctor collection
            let resolvedDoctorName = '';
            try {
                const doctor = await Doctor.findOne({ doctor_id: trimmedDoctorId });
                if (doctor && doctor.name) {
                    resolvedDoctorName = doctor.name;
                }
            } catch (error) {
                console.warn('Could not fetch doctor name:', error.message);
                // Continue with empty doctor_name if lookup fails
            }

            // Generate patient_id if not provided (same pattern as patientController.js)
            const generatedPatientId = trimmedPatientId || uuidv4();

            // Create minimal patient record
            patient = new Patient({
                patient_name: 'Unknown Patient', // Placeholder, will be updated when patient visits
                patient_phone: trimmedPhone,
                patient_id: generatedPatientId,
                doctor_id: trimmedDoctorId,
                doctor_name: resolvedDoctorName,
                reports: [] // Initialize empty reports array
            });

            await patient.save();
            console.log('Created new minimal patient record:', patient.patient_id, 'for phone:', trimmedPhone);
        }
        
        console.log('Patient found:', patient.patient_id, patient.patient_name, 'under doctor:', patient.doctor_id);

        // Process uploaded files
        const uploadedReports = files.map(file => {
            // Create public URL for the uploaded file
            const imageUrl = `/uploads/reports/${file.filename}`;
            
            return {
                report_id: uuidv4(),
                image_url: imageUrl,
                report_type: report_type || 'report', // Default to 'report' if not provided
                description: description || '',
                uploaded_by: uploaded_by || 'patient', // Default to 'patient' for self-uploads
                uploaded_at: new Date(),
                doctor_id: patient.doctor_id, // Store which doctor's record this is under
                doctor_name: '' // Will be populated when fetching
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
        console.error('=== ERROR UPLOADING REPORT ===');
        console.error('Error message:', error.message);
        console.error('Error name:', error.name);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        console.error('Request files:', req.files);
        
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

        // Build $or conditions only for non-empty values
        const orConditions = [];
        if (patient_id && patient_id.trim() !== '') {
            orConditions.push({ patient_id: patient_id.trim() });
        }
        if (patient_phone && patient_phone.trim() !== '') {
            orConditions.push({ patient_phone: patient_phone.trim() });
        }
        
        if (orConditions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or patient_phone must be provided and non-empty'
            });
        }

        const patient = await Patient.findOne({
            doctor_id: doctor_id.trim(),
            $or: orConditions
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

        // Build $or conditions only for non-empty values
        const orConditions = [];
        if (patient_id && patient_id.trim() !== '') {
            orConditions.push({ patient_id: patient_id.trim() });
        }
        if (patient_phone && patient_phone.trim() !== '') {
            orConditions.push({ patient_phone: patient_phone.trim() });
        }
        
        if (orConditions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or patient_phone must be provided and non-empty'
            });
        }

        const patient = await Patient.findOne({
            doctor_id: doctor_id.trim(),
            $or: orConditions
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

/**
 * Upload patient report from Firebase Storage URLs
 * Accepts image_urls array instead of file uploads
 * Used by mobile apps that upload directly to Firebase Storage
 */
const uploadPatientReportFromUrls = async (req, res) => {
    try {
        console.log('=== UPLOAD FROM URLS REQUEST RECEIVED ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const { patient_id, patient_phone, doctor_id, image_urls, report_type, description, uploaded_by } = req.body;

        // Validate required fields
        if (!patient_id && !patient_phone) {
            return res.status(400).json({
                success: false,
                message: 'Either patient_id or patient_phone is required'
            });
        }

        if (!doctor_id || doctor_id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'doctor_id is required'
            });
        }

        if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'image_urls array is required and must contain at least one URL'
            });
        }

        // Validate all URLs are strings and not empty
        const validUrls = image_urls.filter(url => typeof url === 'string' && url.trim() !== '');
        if (validUrls.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'image_urls must contain valid URL strings'
            });
        }

        const trimmedPhone = patient_phone ? patient_phone.trim() : null;
        const trimmedDoctorId = doctor_id.trim();
        const trimmedPatientId = patient_id ? patient_id.trim() : null;
        
        let patient;
        
        // First try: Find by patient_phone + doctor_id
        if (trimmedPhone) {
            patient = await Patient.findOne({
                patient_phone: trimmedPhone,
                doctor_id: trimmedDoctorId
            });
        }

        // Second try: If patient_id provided and not found by phone, try patient_id + doctor_id
        if (!patient && trimmedPatientId) {
            patient = await Patient.findOne({
                patient_id: trimmedPatientId,
                doctor_id: trimmedDoctorId
            });
        }

        // If patient not found, create minimal patient record
        if (!patient) {
            console.log('Patient not found, creating minimal patient record');
            
            // Try to fetch doctor name from Doctor collection
            let resolvedDoctorName = '';
            try {
                const doctor = await Doctor.findOne({ doctor_id: trimmedDoctorId });
                if (doctor && doctor.name) {
                    resolvedDoctorName = doctor.name;
                }
            } catch (error) {
                console.warn('Could not fetch doctor name:', error.message);
            }

            // Generate patient_id if not provided
            const generatedPatientId = trimmedPatientId || uuidv4();

            // Create minimal patient record
            patient = new Patient({
                patient_name: 'Unknown Patient',
                patient_phone: trimmedPhone || '',
                patient_id: generatedPatientId,
                doctor_id: trimmedDoctorId,
                doctor_name: resolvedDoctorName,
                reports: []
            });

            await patient.save();
            console.log('Created new minimal patient record:', patient.patient_id);
        }
        
        console.log('Patient found:', patient.patient_id, patient.patient_name);

        // Create reports from URLs
        const uploadedReports = validUrls.map(url => ({
            report_id: uuidv4(),
            image_url: url, // Firebase Storage URL
            report_type: report_type || 'report',
            description: description || '',
            uploaded_by: uploaded_by || 'patient',
            uploaded_at: new Date(),
            doctor_id: patient.doctor_id,
            doctor_name: ''
        }));

        console.log(`Processing ${uploadedReports.length} report(s) from URLs`);

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
        console.error('=== ERROR UPLOADING REPORT FROM URLS ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Error uploading report',
            error: error.message
        });
    }
};

module.exports = {
    uploadPatientReport,
    uploadPatientReportFromUrls,
    getPatientReports,
    deletePatientReport
};

