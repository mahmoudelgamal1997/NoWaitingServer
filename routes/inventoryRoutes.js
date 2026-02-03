const express = require('express');
const router = express.Router();
const {
    getInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordUsage,
    getUsageHistory,
    getLowStockItems
} = require('../controllers/inventoryController');

// Middleware to verify authentication
const authenticateUser = (req, res, next) => {
    // Authentication logic - passing through for now
    next();
};

// Get all inventory items for a clinic
router.get('/inventory/:clinic_id', authenticateUser, getInventoryItems);

// Get low stock items for a clinic
router.get('/inventory/:clinic_id/low-stock', authenticateUser, getLowStockItems);

// Add new inventory item
router.post('/inventory', authenticateUser, addInventoryItem);

// Update inventory item
router.put('/inventory/:id', authenticateUser, updateInventoryItem);

// Delete inventory item
router.delete('/inventory/:id', authenticateUser, deleteInventoryItem);

// Record usage of inventory item
router.post('/inventory/:id/use', authenticateUser, recordUsage);

// Get usage history for an item
router.get('/inventory/:id/history', authenticateUser, getUsageHistory);

module.exports = router;
