const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    doctor_id: { 
        type: String, 
        required: true, 
        unique: true 
    },
    name: { 
        type: String, 
        default: "" 
    },
    email: { 
        type: String, 
        default: "" 
    },
    settings: {
        receiptHeader: { 
            type: String, 
            default: "" 
        },
        receiptFooter: { 
            type: String, 
            default: "" 
        },
        clinicName: { 
            type: String, 
            default: "" 
        },
        doctorTitle: { 
            type: String, 
            default: "" 
        },
        clinicAddress: { 
            type: String, 
            default: "" 
        },
        clinicPhone: { 
            type: String, 
            default: "" 
        },
        logoUrl: { 
            type: String, 
            default: "" 
        },
        // Consultation fees (كشف)
        consultationFee: {
            type: Number,
            default: 0
        },
        // Revisit/Re-consultation fee (اعاده كشف)
        revisitFee: {
            type: Number,
            default: 0
        }
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Doctor', doctorSchema);