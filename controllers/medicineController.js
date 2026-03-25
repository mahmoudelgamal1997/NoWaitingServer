const Medicine = require('../models/medicine');

// GET /api/medicines/doctor/:doctorId
exports.getMedicines = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const medicines = await Medicine.find({ doctor_id: doctorId }).sort({ name: 1 });
        res.json({ success: true, medicines });
    } catch (error) {
        console.error('getMedicines error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/medicines/doctor/:doctorId
exports.addMedicine = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Medicine name is required' });
        }

        const existing = await Medicine.findOne({
            doctor_id: doctorId,
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Medicine already exists' });
        }

        const medicine = new Medicine({ doctor_id: doctorId, name: name.trim() });
        await medicine.save();
        res.status(201).json({ success: true, medicine });
    } catch (error) {
        console.error('addMedicine error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/medicines/doctor/:doctorId/:medicineId
exports.updateMedicine = async (req, res) => {
    try {
        const { doctorId, medicineId } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Medicine name is required' });
        }

        const medicine = await Medicine.findOneAndUpdate(
            { _id: medicineId, doctor_id: doctorId },
            { name: name.trim() },
            { new: true }
        );

        if (!medicine) {
            return res.status(404).json({ success: false, message: 'Medicine not found' });
        }

        res.json({ success: true, medicine });
    } catch (error) {
        console.error('updateMedicine error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/medicines/doctor/:doctorId/:medicineId
exports.deleteMedicine = async (req, res) => {
    try {
        const { doctorId, medicineId } = req.params;

        const medicine = await Medicine.findOneAndDelete({ _id: medicineId, doctor_id: doctorId });

        if (!medicine) {
            return res.status(404).json({ success: false, message: 'Medicine not found' });
        }

        res.json({ success: true, message: 'Medicine deleted successfully' });
    } catch (error) {
        console.error('deleteMedicine error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
