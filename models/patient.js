const mongoose = require('mongoose');

const drugSchema = new mongoose.Schema({
    drug: {
        type: String,
        default: ""
    },
    frequency: {
        type: String,
        default: ""
    },
    period: {
        type: String,
        default: ""
    },
    timing: {
        type: String,
        default: ""
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
    receipts: [receiptSchema],
    // Billing reference - links to billing record
    billing_id: {
        type: String,
        default: ""
    }
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
    },
    all_visits: {
        type: [visitSchema],
        default: []
    },
    user_order_in_queue: {
        type: Number,
        default: 0
    },
    total_visits: {
        type: Number,
        default: 0
    },
    user_uid: {
        type: String,
        default: ""
    },
    visit_speed: {
        type: String,
        default: ""
    },
    clinic_id: {
        type: String,
        default: ""
    },
    assistant_id: {
        type: String,
        default: ""
    },
    reports: [{
        report_id: {
            type: String,
            default: () => require('uuid').v4()
        },
        image_url: {
            type: String,
            required: true
        },
        report_type: {
            type: String,
            default: "report" // report, examination, investigation, lab, xray
        },
        description: {
            type: String,
            default: ""
        },
        uploaded_by: {
            type: String,
            default: "patient" // 'patient', 'assistant', or actual user_id
        },
        uploaded_at: {
            type: Date,
            default: Date.now
        },
        doctor_id: {
            type: String,
            default: "" // The doctor this report is associated with (if any)
        },
        doctor_name: {
            type: String,
            default: "" // Doctor's name for display
        }
    }]
}, {
    timestamps: true
});

// Remove the unique index
patientSchema.index({ 'visits.visit_id': 1 });

module.exports = mongoose.model('Patient', patientSchema);