const Patient = require('../models/patient');

// Search and filter patients with improved phone number matching
const searchPatients = async (req, res) => {
    try {
        const query = {};

        // Dynamically build the query from request parameters
        if (req.query.patient_name) query.patient_name = { $regex: req.query.patient_name, $options: 'i' };
        
        // Improved phone number search - removes spaces, dashes, etc.
        if (req.query.patient_phone) {
            const formattedPhone = req.query.patient_phone.replace(/[^0-9+]/g, '');
            // Search for phone numbers that contain this sequence, regardless of formatting
            query.patient_phone = { $regex: formattedPhone, $options: 'i' };
        }
        
        if (req.query.patient_id) query.patient_id = req.query.patient_id;
        if (req.query.doctor_id) query.doctor_id = req.query.doctor_id;
        if (req.query.date) query.date = req.query.date;
        if (req.query.time) query.time = req.query.time;
        if (req.query.status) query.status = req.query.status;
        if (req.query.position) query.position = parseInt(req.query.position);
        if (req.query.fcmToken) query.fcmToken = { $regex: req.query.fcmToken, $options: 'i' };
        if (req.query.token) query.token = { $regex: req.query.token, $options: 'i' };
        if (req.query.age) query.age = req.query.age;
        if (req.query.address) query.address = { $regex: req.query.address, $options: 'i' };
        if (req.query.visit_type) query.visit_type = req.query.visit_type;

        // Advanced options
        const options = {};
        
        // Sorting
        if (req.query.sort) {
            const sortField = req.query.sort;
            const sortOrder = req.query.order === 'desc' ? -1 : 1;
            options.sort = { [sortField]: sortOrder };
        } else {
            // Default sort by most recent first
            options.sort = { createdAt: -1 };
        }
        
        // Pagination
        if (req.query.page && req.query.limit) {
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
            options.skip = (page - 1) * limit;
            options.limit = limit;
        }

        // Execute the search query with options
        const patients = await Patient.find(query, null, options);
        
        // Get total count for pagination
        const total = await Patient.countDocuments(query);

        res.json({ 
            total, 
            patients,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : patients.length,
            pages: req.query.limit ? Math.ceil(total / parseInt(req.query.limit)) : 1
        });
    } catch (error) {
        res.status(500).json({ message: 'Error searching patients', error: error.message });
    }
};

module.exports = { searchPatients };