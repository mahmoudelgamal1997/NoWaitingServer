const mongoose = require('mongoose');

const fixedExpenseTemplateSchema = new mongoose.Schema({
    template_id: {
        type: String,
        required: true,
        default: () => require('uuid').v4()
    },
    doctor_id: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'electricity', 'water', 'rent', 'salary', 'supplies',
            'equipment', 'maintenance', 'internet', 'insurance',
            'taxes', 'marketing', 'other'
        ]
    },
    title: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    notes: {
        type: String,
        default: ""
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

fixedExpenseTemplateSchema.index({ doctor_id: 1 });
fixedExpenseTemplateSchema.index({ doctor_id: 1, template_id: 1 }, { unique: true });

module.exports = mongoose.model('FixedExpenseTemplate', fixedExpenseTemplateSchema);
