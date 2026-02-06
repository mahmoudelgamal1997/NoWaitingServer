const mongoose = require('mongoose');

const externalServiceSchema = new mongoose.Schema({
    service_id: {
        type: String,
        required: true,
        default: () => require('uuid').v4()
    },
    doctor_id: {
        type: String,
        required: true
    },
    service_name: {
        type: String,
        required: true
    },
    provider_name: {
        type: String,
        required: true
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

// Compound index for doctor_id and service_id
externalServiceSchema.index({ doctor_id: 1, service_id: 1 }, { unique: true });
externalServiceSchema.index({ doctor_id: 1, isActive: 1 });

module.exports = mongoose.model('ExternalService', externalServiceSchema);
