const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referral_id: {
        type: String,
        default: () => require('uuid').v4()
    },
    referral_date: {
        type: Date,
        default: Date.now
    },
    from_doctor_name: { type: String, default: '' },
    from_doctor_title: { type: String, default: '' },
    from_clinic_name: { type: String, default: '' },
    from_doctor_phone: { type: String, default: '' },
    to_doctor_name: { type: String, default: '' },
    to_doctor_title: { type: String, default: '' },
    to_clinic_name: { type: String, default: '' },
    subject: { type: String, default: '' },
    referral_body: { type: String, default: '' },
    signature: { type: String, default: '' },
    doctor_id: { type: String, default: '' },
    created_at: { type: Date, default: Date.now }
}, { _id: false });

const medicalReportSchema = new mongoose.Schema({
    report_id: {
        type: String,
        default: () => require('uuid').v4()
    },
    diagnosis: {
        type: String,
        default: ""
    },
    medical_report: {
        type: String,
        default: ""
    },
    signature: {
        type: String,
        default: ""
    },
    doctor_id: {
        type: String,
        default: ""
    },
    doctor_name: {
        type: String,
        default: ""
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

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
    },
    form: {
        type: String,
        default: ""
    },
    route: {
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
    },
    prescriptionTemplate: {
        type: String,
        default: "default"
    },
    investigations: {
        type: [String],
        default: []
    }
});

const complaintEntrySchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    complaint: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    doctor_name: { type: String, default: "" }
}, { _id: true });

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
    },
    // Interactive specialty diagram data (dental chart or body map) saved per visit
    diagram_data: {
        type: mongoose.Schema.Types.Mixed,
        default: null
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
    // Normalized phone (digits only, last 10) for matching same patient across formats
    normalized_phone: {
        type: String,
        default: '',
        index: true
    },
    // Normalized name (trimmed, lowercased) for differentiating same-phone patients (e.g. parent + children)
    normalized_name: {
        type: String,
        default: '',
        index: true
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
    visit_urgency: {
        type: String,
        enum: ['normal', 'urgent'],
        default: 'normal'
    },
    original_visit_type: {
        type: String,
        default: ""
    },
    visit_type_changed: {
        type: Boolean,
        default: false
    },
    visit_type_change_history: [{
        from_type: String,
        to_type: String,
        from_urgency: String,
        to_urgency: String,
        old_price: Number,
        new_price: Number,
        changed_by: String,
        changed_at: {
            type: Date,
            default: Date.now
        },
        reason: String
    }],
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
    complaint_history: {
        type: [complaintEntrySchema],
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
    file_number: {
        type: String,
        default: null,
        index: true
    },
    medical_reports: {
        type: [medicalReportSchema],
        default: []
    },
    referrals: {
        type: [referralSchema],
        default: []
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
    }],
    obgynHistory: {
        marriedSince: { type: String, default: "" },
        gravidity: { type: Number, default: null },
        parity: { type: Number, default: null },
        living: { type: Number, default: null },
        abortion: { type: Number, default: null },
        deaths: { type: Number, default: null },
        deliveryType: { type: String, default: "" },
        deliverySince: { type: String, default: "" },
        lmp: { type: String, default: "" },
        edd: { type: String, default: "" },
        medications: { type: String, default: "" },
        pastHistory: { type: String, default: "" },
        surgicalHistory: { type: String, default: "" },
        consanguinity: { type: String, default: "" },
        bloodGroup: { type: String, default: "" },
        bloodPressure: { type: String, default: "" },
        weight: { type: String, default: "" }
    },
    insurance_company_id: { type: String, default: '' },
    insurance_company_name: { type: String, default: '' },
    insurance_number: { type: String, default: '' },
    coverage_percentage: { type: Number, default: 0 },
    payment_type: { type: String, default: 'cash' },
    consultation_fee: { type: Number, default: 0 }
}, {
    timestamps: true
});

// Remove the unique index
patientSchema.index({ 'visits.visit_id': 1 });
patientSchema.index({ doctor_id: 1, normalized_phone: 1 });
patientSchema.index({ doctor_id: 1, normalized_phone: 1, normalized_name: 1 });

module.exports = mongoose.model('Patient', patientSchema);