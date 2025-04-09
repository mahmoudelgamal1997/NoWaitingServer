const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
    visit_id: { 
        type: String, 
        required: true, 
        unique: true 
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
    receipts: [{
        drugs: [{
            drug: { type: String, required: true },
            frequency: { type: String, required: true },
            period: { type: String, required: true },
            timing: { type: String, required: true }
        }],
        notes: { type: String, default: "" },
        date: { type: Date, default: Date.now },
        drugModel: { type: String, default: "new" }
    }]
}, { 
    // Add a timestamp option to automatically manage createdAt and updatedAt
    timestamps: true 
});

const patientSchema = new mongoose.Schema({
    patient_name: { type: String, required: true },
    patient_phone: { type: String, required: true },
    patient_id: { type: String, required: true },
    doctor_id: { type: String, required: true },
    doctor_name: { type: String, default:"" },
    age: { type: String, default: "" },
    address: { type: String, default: ""},
    fcmToken: { type: String, default: "" },
    visits: [visitSchema]
}, {
    // Add a timestamp option to automatically manage createdAt and updatedAt
    timestamps: true 
});

// Add a virtual to get the most recent visit
patientSchema.virtual('latest_visit').get(function() {
    return this.visits.length > 0 
        ? this.visits.reduce((latest, visit) => 
            (!latest || visit.date > latest.date) ? visit : latest, null)
        : null;
});

module.exports = mongoose.model('Patient', patientSchema);