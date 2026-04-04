const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    expense_id: {
        type: String,
        required: true,
        default: () => require('uuid').v4()
    },
    doctor_id: {
        type: String,
        required: true
    },
    clinic_id: {
        type: String,
        default: ""
    },
    category: {
        type: String,
        required: true,
        enum: [
            'electricity',
            'water',
            'rent',
            'salary',
            'supplies',
            'equipment',
            'maintenance',
            'internet',
            'insurance',
            'taxes',
            'marketing',
            'other'
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
    is_recurring: {
        type: Boolean,
        default: false
    },
    expenseDate: {
        type: Date,
        required: true,
        default: Date.now
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

expenseSchema.index({ doctor_id: 1, expenseDate: -1 });
expenseSchema.index({ doctor_id: 1, category: 1 });
expenseSchema.index({ doctor_id: 1, expense_id: 1 }, { unique: true });

module.exports = mongoose.model('Expense', expenseSchema);
