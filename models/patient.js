const mongoose = require('mongoose');

const drugSchema = new mongoose.Schema({
    drug: { 
        type: String, 
        required: true 
    },
    frequency: { 
        type: String, 
        required: true 
    },
    period: { 
        type: String, 
        required: true 
    },
    timing: { 
        type: String, 
        required: true 
    }
});

const receiptSchema = new mongoose.Schema({
    drugs: [drugSchema],
    notes: { 
        type: String, 
        default: "" 
    },
    date: { 
        type: Date, 
        default: Date.now 
    },
    drugModel: { 
        type: String, 
        default: "new" 
    }
});

const visitSchema = new mongoose.Schema({
    visit_id: { 
        type: String 
    },
    date: { 
        type: Date, 
        default: Date.now 
    },
    time: { 
        type: String, 
        default: () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) 
    },
    visit_type: { 
        type: String, 
        default: "كشف" 
    },
    complaint: { 
        type: String, 
        default: "" 
    },
    diagnosis: { 
        type: String, 
        default: "" 
    },
    receipts: [receiptSchema]
}, { _id: true });

const patientSchema = new mongoose.Schema({
    patient_name: { 
        type: String, 
        required: true 
    },
    patient_phone: { 
        type: String, 
        required: true 
    },
    patient_id: { 
        type: String, 
        required: true 
    },
    doctor_id: { 
        type: String, 
        required: true 
    },
    doctor_name: { 
        type: String, 
        default: "" 
    },
    date: { 
        type: String, 
        default: () => new Date().toISOString().split('T')[0] 
    },
    time: { 
        type: String, 
        default: () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) 
    },
    status: { 
        type: String, 
        default: 'WAITING' 
    },
    position: { 
        type: Number, 
        default: 0 
    },
    fcmToken: { 
        type: String, 
        default: "" 
    },
    token: { 
        type: String, 
        default: "" 
    },
    age: { 
        type: String, 
        default: "" 
    },
    address: { 
        type: String, 
        default: "" 
    },
    visit_type: { 
        type: String, 
        default: "كشف" 
    },
    receipt: { 
        type: String, 
        default: "" 
    },
    visits: {
        type: [visitSchema],
        default: []
    }
}, { 
    timestamps: true 
});

// Remove the unique index
patientSchema.index({ 'visits.visit_id': 1 });

module.exports = mongoose.model('Patient', patientSchema);