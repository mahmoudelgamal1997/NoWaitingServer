const mongoose = require('mongoose');

const packageUsageSchema = new mongoose.Schema({
    usage_id: {
        type: String,
        required: true,
        default: () => require('uuid').v4()
    },
    patient_package_id: {
        type: String,
        required: true
    },
    visit_id: {
        type: String,
        default: ''
    },
    used_sessions: {
        type: Number,
        default: 1
    },
    used_at: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

packageUsageSchema.index({ patient_package_id: 1 });

module.exports = mongoose.model('PackageUsage', packageUsageSchema);
