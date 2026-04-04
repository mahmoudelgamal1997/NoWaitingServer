const express = require('express');
const router = express.Router();
const {
    createTemplate,
    getTemplates,
    updateTemplate,
    deleteTemplate,
    applyTemplates
} = require('../controllers/fixedExpenseController');

const authenticateUser = (req, res, next) => {
    next();
};

router.post('/fixed-expenses/templates', authenticateUser, createTemplate);
router.get('/fixed-expenses/templates/:doctor_id', authenticateUser, getTemplates);
router.put('/fixed-expenses/templates/:doctor_id/:template_id', authenticateUser, updateTemplate);
router.delete('/fixed-expenses/templates/:doctor_id/:template_id', authenticateUser, deleteTemplate);
router.post('/fixed-expenses/apply', authenticateUser, applyTemplates);

module.exports = router;
