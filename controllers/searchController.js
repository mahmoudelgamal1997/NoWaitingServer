const Patient = require('../models/patient');

// Search and filter patients
const searchPatients = async (req, res) => {
    try {
        const query = {};

        // Dynamically build the query from request parameters
        if (req.query.patient_name) query.patient_name = { $regex: req.query.patient_name, $options: 'i' };
        if (req.query.patient_phone) query.patient_phone = { $regex: req.query.patient_phone, $options: 'i' };
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

        // Execute the search query
        const patients = await Patient.find(query);

        res.json({ total: patients.length, patients });
    } catch (error) {
        res.status(500).json({ message: 'Error searching patients', error: error.message });
    }
};

module.exports = { searchPatients };
