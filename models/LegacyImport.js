const mongoose = require('mongoose');

const legacyImportSchema = new mongoose.Schema({
    import_batch_id: {
        type: String,
        required: true,
        index: true
    },
    doctor_id: {
        type: String,
        required: true,
        index: true
    },
    clinic_id: {
        type: String,
        default: ''
    },
    source_file_name: {
        type: String,
        default: ''
    },
    legacy_patient_id: {
        type: String,
        index: true
    },
    patient_mongo_id: {
        type: String,
        default: ''
    },
    patient_id: {
        type: String,
        default: ''
    },
    patient_data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    emergency_contacts: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    visits: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    investigations: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    medications: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    physiotherapy: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    }
}, {
    timestamps: true
});

legacyImportSchema.index({ import_batch_id: 1, legacy_patient_id: 1 });
legacyImportSchema.index({ doctor_id: 1, legacy_patient_id: 1 });

module.exports = mongoose.model('LegacyImport', legacyImportSchema);
