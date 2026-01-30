const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    service_id: { 
        type: String, 
        required: true,
        default: () => require('uuid').v4()
    },
    doctor_id: { 
        type: String, 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    name_ar: { 
        type: String, 
        default: "" 
    },
    description: { 
        type: String, 
        default: "" 
    },
    price: { 
        type: Number, 
        required: true,
        min: 0 
    },
    category: { 
        type: String, 
        default: "general" // e.g., "imaging", "lab", "procedure", "general"
    },
    isActive: { 
        type: Boolean, 
        default: true 
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

// Compound index for doctor_id and service_id
serviceSchema.index({ doctor_id: 1, service_id: 1 }, { unique: true });
serviceSchema.index({ doctor_id: 1, isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);

