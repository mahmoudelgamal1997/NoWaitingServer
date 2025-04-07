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