const Expense = require('../models/expense');
const Billing = require('../models/billing');
const { v4: uuidv4 } = require('uuid');

const createExpense = async (req, res) => {
    try {
        const { doctor_id, clinic_id, category, title, amount, notes, is_recurring, expenseDate } = req.body;

        if (!doctor_id || !category || !title || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id, category, title, and amount are required'
            });
        }

        const expense = new Expense({
            expense_id: uuidv4(),
            doctor_id,
            clinic_id: clinic_id || "",
            category,
            title,
            amount,
            notes: notes || "",
            is_recurring: is_recurring || false,
            expenseDate: expenseDate ? new Date(expenseDate) : new Date()
        });

        await expense.save();

        res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            data: expense
        });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating expense',
            error: error.message
        });
    }
};

const getExpenses = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { startDate, endDate, category, page = 1, limit = 50 } = req.query;

        const query = { doctor_id };

        if (startDate || endDate) {
            query.expenseDate = {};
            if (startDate) query.expenseDate.$gte = new Date(startDate);
            if (endDate) query.expenseDate.$lte = new Date(endDate);
        }

        if (category && category !== 'all') {
            query.category = category;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [expenses, total] = await Promise.all([
            Expense.find(query)
                .sort({ expenseDate: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Expense.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: expenses,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching expenses',
            error: error.message
        });
    }
};

const updateExpense = async (req, res) => {
    try {
        const { doctor_id, expense_id } = req.params;
        const updates = req.body;

        updates.updatedAt = new Date();

        const expense = await Expense.findOneAndUpdate(
            { doctor_id, expense_id },
            updates,
            { new: true }
        );

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        res.json({
            success: true,
            message: 'Expense updated successfully',
            data: expense
        });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating expense',
            error: error.message
        });
    }
};

const deleteExpense = async (req, res) => {
    try {
        const { doctor_id, expense_id } = req.params;

        const expense = await Expense.findOneAndDelete({ doctor_id, expense_id });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        res.json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting expense',
            error: error.message
        });
    }
};

const getExpenseSummary = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { startDate, endDate } = req.query;

        const matchStage = { doctor_id };
        if (startDate || endDate) {
            matchStage.expenseDate = {};
            if (startDate) matchStage.expenseDate.$gte = new Date(startDate);
            if (endDate) matchStage.expenseDate.$lte = new Date(endDate);
        }

        const [categoryBreakdown, totalExpenses, revenueData] = await Promise.all([
            Expense.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$category',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { total: -1 } }
            ]),

            Expense.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$amount' },
                        totalCount: { $sum: 1 }
                    }
                }
            ]),

            Billing.aggregate([
                {
                    $match: {
                        doctor_id,
                        paymentStatus: { $ne: 'cancelled' },
                        ...(startDate || endDate ? {
                            billingDate: {
                                ...(startDate ? { $gte: new Date(startDate) } : {}),
                                ...(endDate ? { $lte: new Date(endDate) } : {})
                            }
                        } : {})
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        totalBillings: { $sum: 1 }
                    }
                }
            ])
        ]);

        const totalExp = totalExpenses[0] || { totalAmount: 0, totalCount: 0 };
        const totalRev = revenueData[0] || { totalRevenue: 0, totalBillings: 0 };

        res.json({
            success: true,
            data: {
                totalExpenses: totalExp.totalAmount,
                expenseCount: totalExp.totalCount,
                totalRevenue: totalRev.totalRevenue,
                totalBillings: totalRev.totalBillings,
                profit: totalRev.totalRevenue - totalExp.totalAmount,
                categoryBreakdown: categoryBreakdown.map(c => ({
                    category: c._id,
                    total: c.total,
                    count: c.count
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching expense summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching expense summary',
            error: error.message
        });
    }
};

const getExpenseMonthlyTrend = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { months = 6 } = req.query;

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const [expenseTrend, revenueTrend] = await Promise.all([
            Expense.aggregate([
                {
                    $match: {
                        doctor_id,
                        expenseDate: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$expenseDate' },
                            month: { $month: '$expenseDate' }
                        },
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),

            Billing.aggregate([
                {
                    $match: {
                        doctor_id,
                        paymentStatus: { $ne: 'cancelled' },
                        billingDate: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$billingDate' },
                            month: { $month: '$billingDate' }
                        },
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ])
        ]);

        const monthlyData = [];
        const now = new Date();
        for (let i = parseInt(months) - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;

            const exp = expenseTrend.find(e => e._id.year === year && e._id.month === month);
            const rev = revenueTrend.find(r => r._id.year === year && r._id.month === month);

            monthlyData.push({
                year,
                month,
                label: `${year}-${String(month).padStart(2, '0')}`,
                expenses: exp ? exp.total : 0,
                expenseCount: exp ? exp.count : 0,
                revenue: rev ? rev.total : 0,
                revenueCount: rev ? rev.count : 0,
                profit: (rev ? rev.total : 0) - (exp ? exp.total : 0)
            });
        }

        res.json({
            success: true,
            data: monthlyData
        });
    } catch (error) {
        console.error('Error fetching monthly trend:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching monthly trend',
            error: error.message
        });
    }
};

module.exports = {
    createExpense,
    getExpenses,
    updateExpense,
    deleteExpense,
    getExpenseSummary,
    getExpenseMonthlyTrend
};
