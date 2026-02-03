const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    clinic_id: {
        type: String,
        required: true,
        index: true
    },
    doctor_id: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Medications', 'Consumables', 'Equipment', 'Supplies', 'Other'],
        default: 'Other'
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        default: 'pieces'
    },
    purchasePrice: {
        type: Number,
        default: 0,
        min: 0
    },
    supplier: {
        type: String,
        trim: true
    },
    expirationDate: {
        type: Date
    },
    minStockLevel: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: {
        type: String,
        trim: true
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

// Index for efficient queries
inventorySchema.index({ clinic_id: 1, doctor_id: 1 });
inventorySchema.index({ category: 1 });

// Update timestamp on save
inventorySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for checking if stock is low
inventorySchema.virtual('isLowStock').get(function () {
    return this.quantity <= this.minStockLevel;
});

// Virtual for checking if expired
inventorySchema.virtual('isExpired').get(function () {
    if (!this.expirationDate) return false;
    return new Date() > this.expirationDate;
});

module.exports = mongoose.model('Inventory', inventorySchema);
