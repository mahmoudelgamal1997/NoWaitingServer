const FixedExpenseTemplate = require('../models/fixedExpenseTemplate');
const Expense = require('../models/expense');
const { v4: uuidv4 } = require('uuid');

const createTemplate = async (req, res) => {
    try {
        const { doctor_id, category, title, amount, notes } = req.body;

        if (!doctor_id || !category || !title || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id, category, title, and amount are required'
            });
        }

        const template = new FixedExpenseTemplate({
            template_id: uuidv4(),
            doctor_id,
            category,
            title,
            amount,
            notes: notes || ""
        });

        await template.save();

        res.status(201).json({
            success: true,
            message: 'Fixed expense template created successfully',
            data: template
        });
    } catch (error) {
        console.error('Error creating fixed expense template:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating fixed expense template',
            error: error.message
        });
    }
};

const getTemplates = async (req, res) => {
    try {
        const { doctor_id } = req.params;

        const templates = await FixedExpenseTemplate.find({ doctor_id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('Error fetching fixed expense templates:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching fixed expense templates',
            error: error.message
        });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { doctor_id, template_id } = req.params;
        const updates = req.body;
        updates.updatedAt = new Date();

        const template = await FixedExpenseTemplate.findOneAndUpdate(
            { doctor_id, template_id },
            updates,
            { new: true }
        );

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.json({
            success: true,
            message: 'Template updated successfully',
            data: template
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating template',
            error: error.message
        });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        const { doctor_id, template_id } = req.params;

        const template = await FixedExpenseTemplate.findOneAndDelete({ doctor_id, template_id });

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting template',
            error: error.message
        });
    }
};

const applyTemplates = async (req, res) => {
    try {
        const { doctor_id, template_ids, expenseDate } = req.body;

        if (!doctor_id || !template_ids || !template_ids.length) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id and template_ids are required'
            });
        }

        const templates = await FixedExpenseTemplate.find({
            doctor_id,
            template_id: { $in: template_ids }
        });

        if (!templates.length) {
            return res.status(404).json({
                success: false,
                message: 'No templates found'
            });
        }

        const date = expenseDate ? new Date(expenseDate) : new Date();

        const expenses = templates.map(t => ({
            expense_id: uuidv4(),
            doctor_id,
            category: t.category,
            title: t.title,
            amount: t.amount,
            notes: t.notes,
            is_recurring: true,
            expenseDate: date,
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        const created = await Expense.insertMany(expenses);

        res.status(201).json({
            success: true,
            message: `${created.length} fixed expenses applied successfully`,
            data: created
        });
    } catch (error) {
        console.error('Error applying fixed expense templates:', error);
        res.status(500).json({
            success: false,
            message: 'Error applying fixed expense templates',
            error: error.message
        });
    }
};

module.exports = {
    createTemplate,
    getTemplates,
    updateTemplate,
    deleteTemplate,
    applyTemplates
};
