const Inventory = require('../models/inventory');
const InventoryUsage = require('../models/inventoryUsage');

// Get all inventory items for a clinic
const getInventoryItems = async (req, res) => {
    try {
        const { clinic_id } = req.params;
        const { category, lowStock } = req.query;

        if (!clinic_id) {
            return res.status(400).json({ message: 'Clinic ID is required' });
        }

        let query = { clinic_id };

        if (category && category !== 'all') {
            query.category = category;
        }

        const items = await Inventory.find(query).sort({ name: 1 });

        // Filter for low stock if requested
        let filteredItems = items;
        if (lowStock === 'true') {
            filteredItems = items.filter(item => item.quantity <= item.minStockLevel);
        }

        res.status(200).json({
            message: 'Inventory items retrieved successfully',
            items: filteredItems,
            total: filteredItems.length
        });
    } catch (error) {
        console.error('Error retrieving inventory items:', error);
        res.status(500).json({
            message: 'Error retrieving inventory items',
            error: error.message
        });
    }
};

// Add new inventory item
const addInventoryItem = async (req, res) => {
    try {
        const {
            clinic_id,
            doctor_id,
            name,
            category,
            quantity,
            unit,
            purchasePrice,
            supplier,
            expirationDate,
            minStockLevel,
            notes
        } = req.body;

        if (!clinic_id || !doctor_id || !name) {
            return res.status(400).json({
                message: 'Clinic ID, Doctor ID, and Item Name are required'
            });
        }

        const newItem = new Inventory({
            clinic_id,
            doctor_id,
            name,
            category: category || 'Other',
            quantity: quantity || 0,
            unit: unit || 'pieces',
            purchasePrice: purchasePrice || 0,
            supplier,
            expirationDate,
            minStockLevel: minStockLevel || 0,
            notes
        });

        await newItem.save();

        res.status(201).json({
            message: 'Inventory item added successfully',
            item: newItem
        });
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({
            message: 'Error adding inventory item',
            error: error.message
        });
    }
};

// Update inventory item
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Item ID is required' });
        }

        const updatedItem = await Inventory.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!updatedItem) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        res.status(200).json({
            message: 'Inventory item updated successfully',
            item: updatedItem
        });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({
            message: 'Error updating inventory item',
            error: error.message
        });
    }
};

// Delete inventory item
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Item ID is required' });
        }

        const deletedItem = await Inventory.findByIdAndDelete(id);

        if (!deletedItem) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        res.status(200).json({
            message: 'Inventory item deleted successfully',
            item: deletedItem
        });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({
            message: 'Error deleting inventory item',
            error: error.message
        });
    }
};

// Record usage of inventory item
const recordUsage = async (req, res) => {
    try {
        const { id } = req.params;
        const { patient_id, visit_id, quantity, usedBy, notes } = req.body;

        if (!id || !patient_id || !quantity || !usedBy) {
            return res.status(400).json({
                message: 'Item ID, Patient ID, Quantity, and User ID are required'
            });
        }

        // Find the inventory item
        const item = await Inventory.findById(id);
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        // Check if sufficient quantity available
        if (item.quantity < quantity) {
            return res.status(400).json({
                message: 'Insufficient quantity in stock',
                available: item.quantity,
                requested: quantity
            });
        }

        // Create usage record
        const usage = new InventoryUsage({
            inventory_id: id,
            patient_id,
            visit_id,
            quantity,
            usedBy,
            notes
        });

        await usage.save();

        // Deduct from inventory
        item.quantity -= quantity;
        await item.save();

        res.status(200).json({
            message: 'Usage recorded successfully',
            usage,
            remainingStock: item.quantity
        });
    } catch (error) {
        console.error('Error recording usage:', error);
        res.status(500).json({
            message: 'Error recording usage',
            error: error.message
        });
    }
};

// Get usage history for an item
const getUsageHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50 } = req.query;

        if (!id) {
            return res.status(400).json({ message: 'Item ID is required' });
        }

        const history = await InventoryUsage.find({ inventory_id: id })
            .sort({ usedAt: -1 })
            .limit(parseInt(limit))
            .populate('inventory_id', 'name unit');

        res.status(200).json({
            message: 'Usage history retrieved successfully',
            history,
            total: history.length
        });
    } catch (error) {
        console.error('Error retrieving usage history:', error);
        res.status(500).json({
            message: 'Error retrieving usage history',
            error: error.message
        });
    }
};

// Get low stock items
const getLowStockItems = async (req, res) => {
    try {
        const { clinic_id } = req.params;

        if (!clinic_id) {
            return res.status(400).json({ message: 'Clinic ID is required' });
        }

        const items = await Inventory.find({ clinic_id });
        const lowStockItems = items.filter(item => item.quantity <= item.minStockLevel);

        res.status(200).json({
            message: 'Low stock items retrieved successfully',
            items: lowStockItems,
            total: lowStockItems.length
        });
    } catch (error) {
        console.error('Error retrieving low stock items:', error);
        res.status(500).json({
            message: 'Error retrieving low stock items',
            error: error.message
        });
    }
};

module.exports = {
    getInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordUsage,
    getUsageHistory,
    getLowStockItems
};
