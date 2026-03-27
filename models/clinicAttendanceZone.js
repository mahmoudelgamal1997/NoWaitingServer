const mongoose = require('mongoose');

const clinicAttendanceZoneSchema = new mongoose.Schema({
    doctor_id: { type: String, required: true, index: true },
    clinic_id: { type: String, required: true, index: true },
    clinic_name: { type: String, default: '' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius_meters: { type: Number, default: 150 },
    enabled: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now },
});
clinicAttendanceZoneSchema.index({ doctor_id: 1, clinic_id: 1 }, { unique: true });

module.exports = mongoose.model('ClinicAttendanceZone', clinicAttendanceZoneSchema);
