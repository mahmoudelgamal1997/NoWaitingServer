const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    doctor_id: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

medicineSchema.index({ doctor_id: 1, name: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
