const mongoose = require('mongoose');

const visitTypeSchema = new mongoose.Schema({
    type_id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    name_ar: {
        type: String,
        required: true
    },
    normal_price: {
        type: Number,
        required: true,
        default: 0
    },
    urgent_price: {
        type: Number,
        required: true,
        default: 0
    },
    is_active: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, { _id: false });

const visitTypeConfigurationSchema = new mongoose.Schema({
    doctor_id: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    clinic_id: {
        type: String,
        default: ''
    },
    visit_types: [visitTypeSchema],
    default_type: {
        type: String,
        default: 'visit'
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

// Update timestamp on save
visitTypeConfigurationSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index for efficient queries
visitTypeConfigurationSchema.index({ doctor_id: 1 });

module.exports = mongoose.model('VisitTypeConfiguration', visitTypeConfigurationSchema);
