const express = require('express');
const router = express.Router();
const {
    createExpense,
    getExpenses,
    updateExpense,
    deleteExpense,
    getExpenseSummary,
    getExpenseMonthlyTrend
} = require('../controllers/expenseController');

const authenticateUser = (req, res, next) => {
    next();
};

router.post('/expenses', authenticateUser, createExpense);
router.get('/expenses/doctor/:doctor_id', authenticateUser, getExpenses);
router.put('/expenses/doctor/:doctor_id/:expense_id', authenticateUser, updateExpense);
router.delete('/expenses/doctor/:doctor_id/:expense_id', authenticateUser, deleteExpense);
router.get('/expenses/summary/:doctor_id', authenticateUser, getExpenseSummary);
router.get('/expenses/trend/:doctor_id', authenticateUser, getExpenseMonthlyTrend);

module.exports = router;
