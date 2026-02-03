const mongoose = require('mongoose');

const inventoryUsageSchema = new mongoose.Schema({
    inventory_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true,
        index: true
    },
    patient_id: {
        type: String,
        required: true,
        index: true
    },
    visit_id: {
        type: mongoose.Schema.Types.ObjectId
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    usedBy: {
        type: String,
        required: true,
        index: true
    },
    usedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    notes: {
        type: String,
        trim: true
    }
});

// Index for efficient queries
inventoryUsageSchema.index({ inventory_id: 1, usedAt: -1 });
inventoryUsageSchema.index({ patient_id: 1, usedAt: -1 });

module.exports = mongoose.model('InventoryUsage', inventoryUsageSchema);
