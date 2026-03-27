const mongoose = require('mongoose');

const assistantAttendanceLogSchema = new mongoose.Schema({
    assistant_id: { type: String, required: true, index: true },
    assistant_name: { type: String, default: '' },
    assistant_email: { type: String, default: '' },
    doctor_id: { type: String, required: true, index: true },
    clinic_id: { type: String, required: true, index: true },
    clinic_name: { type: String, default: '' },
    action: { type: String, enum: ['sign_in', 'sign_out'], required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy_meters: { type: Number },
    distance_from_center_m: { type: Number },
    within_zone: { type: Boolean, required: true },
    radius_meters_used: { type: Number },
    createdAt: { type: Date, default: Date.now },
});
assistantAttendanceLogSchema.index({ doctor_id: 1, createdAt: -1 });

module.exports = mongoose.model('AssistantAttendanceLog', assistantAttendanceLogSchema);
