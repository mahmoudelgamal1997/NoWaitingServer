const mongoose = require('mongoose');

// Schema for individual form fields
const fieldSchema = new mongoose.Schema({
    field_id: {
        type: String,
        required: true
    },
    label: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'long-text', 'checkbox', 'radio'],
        default: 'text'
    },
    options: {
        type: [String],
        default: []
    },
    required: {
        type: Boolean,
        default: false
    }
}, { _id: false });

// Schema for form sections
const sectionSchema = new mongoose.Schema({
    section_id: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    fields: [fieldSchema]
}, { _id: false });

// Main template schema
const historyTemplateSchema = new mongoose.Schema({
    doctor_id: {
        type: String,
        required: true,
        index: true
    },
    template_name: {
        type: String,
        default: 'Medical History Template'
    },
    sections: [sectionSchema],
    is_default: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for quick lookup by doctor
historyTemplateSchema.index({ doctor_id: 1 });

module.exports = mongoose.model('HistoryTemplate', historyTemplateSchema);
