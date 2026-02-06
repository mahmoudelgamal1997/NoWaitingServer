const mongoose = require('mongoose');

const externalServiceRequestSchema = new mongoose.Schema({
    request_id: {
        type: String,
        required: true,
        default: () => require('uuid').v4()
    },
    doctor_id: {
        type: String,
        required: true
    },
    patient_id: {
        type: String,
        required: true
    },
    patient_name: {
        type: String,
        default: ""
    },
    external_service_id: {
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
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    visit_id: {
        type: String,
        default: ""
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
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

// Indexes for efficient queries
externalServiceRequestSchema.index({ doctor_id: 1, patient_id: 1 });
externalServiceRequestSchema.index({ doctor_id: 1, status: 1 });
externalServiceRequestSchema.index({ request_id: 1 });

module.exports = mongoose.model('ExternalServiceRequest', externalServiceRequestSchema);
