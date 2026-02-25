const mongoose = require('mongoose');

// Schema for individual service items in a bill
const billingServiceItemSchema = new mongoose.Schema({
    service_id: { 
        type: String, 
        required: true 
    },
    service_name: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    },
    quantity: { 
        type: Number, 
        default: 1 
    },
    subtotal: { 
        type: Number, 
        required: true 
    }
}, { _id: false });

// Schema for discount
const discountSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['fixed', 'percentage'], 
        required: true 
    },
    value: { 
        type: Number, 
        required: true,
        min: 0 
    },
    amount: { 
        type: Number, 
        required: true // The calculated discount amount in EGP
    },
    reason: { 
        type: String, 
        default: "" 
    }
}, { _id: false });

const billingSchema = new mongoose.Schema({
    billing_id: { 
        type: String, 
        required: true,
        default: () => require('uuid').v4()
    },
    doctor_id: { 
        type: String, 
        required: true 
    },
    patient_id: { 
        type: String, 
        required: true 
    },
    patient_name: { 
        type: String, 
        required: true 
    },
    patient_phone: { 
        type: String, 
        default: "" 
    },
    visit_id: { 
        type: String, 
        default: "" // Optional link to specific visit
    },
    clinic_id: { 
        type: String, 
        default: "" 
    },
    
    // Consultation fee
    consultationFee: { 
        type: Number, 
        default: 0 
    },
    consultationType: { 
        type: String, 
        default: "كشف" // e.g., "كشف", "استشارة", "متابعة"
    },
    
    // Services
    services: [billingServiceItemSchema],
    
    // Totals
    servicesTotal: { 
        type: Number, 
        default: 0 
    },
    subtotal: { 
        type: Number, 
        default: 0 // consultationFee + servicesTotal
    },
    
    // Discount
    discount: discountSchema,
    
    // Final amount
    totalAmount: { 
        type: Number, 
        required: true 
    },
    
    // Payment status
    paymentStatus: { 
        type: String, 
        enum: ['pending', 'paid', 'partial', 'cancelled', 'refund_due'], 
        default: 'paid' 
    },
    paymentMethod: { 
        type: String, 
        enum: ['cash', 'card', 'insurance', 'other'], 
        default: 'cash' 
    },
    amountPaid: { 
        type: Number, 
        default: 0 
    },
    
    // Notes
    notes: { 
        type: String, 
        default: "" 
    },
    
    // Date of billing
    billingDate: { 
        type: Date, 
        default: Date.now 
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

// Indexes for efficient querying
billingSchema.index({ doctor_id: 1, billingDate: -1 });
billingSchema.index({ doctor_id: 1, patient_id: 1 });
billingSchema.index({ doctor_id: 1, billing_id: 1 }, { unique: true });
billingSchema.index({ visit_id: 1 });

module.exports = mongoose.model('Billing', billingSchema);

