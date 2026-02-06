const mongoose = require('mongoose');

const patientMedicalHistorySchema = new mongoose.Schema({
    patient_id: {
        type: String,
        required: true,
        index: true
    },
    doctor_id: {
        type: String,
        required: true,
        index: true
    },
    patient_name: {
        type: String,
        default: ''
    },
    // The actual form data - stored as key-value pairs (all strings)
    // Key format: "section_id.field_id"
    data: {
        type: Map,
        of: String,
        default: {}
    },
    // Snapshot of the template structure used at the time of entry
    template_snapshot: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    // Entry metadata
    recorded_by: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
patientMedicalHistorySchema.index({ patient_id: 1, doctor_id: 1, createdAt: -1 });

module.exports = mongoose.model('PatientMedicalHistory', patientMedicalHistorySchema);
