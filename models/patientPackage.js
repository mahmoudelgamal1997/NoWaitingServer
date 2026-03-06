const mongoose = require('mongoose');

const patientPackageSchema = new mongoose.Schema({
    patient_package_id: {
        type: String,
        required: true,
        default: () => require('uuid').v4()
    },
    patient_id: {
        type: String,
        required: true
    },
    package_id: {
        type: String,
        required: true
    },
    doctor_id: {
        type: String,
        required: true
    },
    clinic_id: {
        type: String,
        default: ''
    },
    total_sessions: {
        type: Number,
        required: true,
        min: 1
    },
    remaining_sessions: {
        type: Number,
        required: true,
        min: 0
    },
    start_date: {
        type: Date,
        required: true,
        default: Date.now
    },
    expiry_date: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'finished', 'expired'],
        default: 'active'
    },
    package_name: {
        type: String,
        default: ''
    },
    service_id: {
        type: String,
        default: ''
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

patientPackageSchema.index({ patient_id: 1, doctor_id: 1 });
patientPackageSchema.index({ patient_id: 1, status: 1 });
patientPackageSchema.index({ doctor_id: 1 });

module.exports = mongoose.model('PatientPackage', patientPackageSchema);
