const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const insuranceCompanySchema = new mongoose.Schema({
    company_id: {
        type: String,
        required: true,
        default: () => uuidv4()
    },
    doctor_id: {
        type: String,
        required: true
    },
    name_ar: {
        type: String,
        required: true
    },
    name_en: {
        type: String,
        default: ''
    },
    coverage_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    notes: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

insuranceCompanySchema.index({ doctor_id: 1, company_id: 1 }, { unique: true });
insuranceCompanySchema.index({ doctor_id: 1, isActive: 1 });

module.exports = mongoose.model('InsuranceCompany', insuranceCompanySchema);
