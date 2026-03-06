const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    package_id: {
        type: String,
        required: true,
        default: () => require('uuid').v4()
    },
    doctor_id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    service_id: {
        type: String,
        required: true
    },
    service_name: {
        type: String,
        default: ''
    },
    sessions_count: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    price_per_session: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        default: ''
    },
    expiry_days: {
        type: Number,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

packageSchema.index({ doctor_id: 1, package_id: 1 }, { unique: true });
packageSchema.index({ doctor_id: 1 });

module.exports = mongoose.model('Package', packageSchema);
