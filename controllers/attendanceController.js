const ClinicAttendanceZone = require('../models/clinicAttendanceZone');
const AssistantAttendanceLog = require('../models/assistantAttendanceLog');
const { distanceMeters } = require('../utils/geolocation');

exports.listZones = async (req, res) => {
    try {
        const { doctorId } = req.params;
        if (!doctorId) return res.status(400).json({ success: false, message: 'doctorId required' });
        const zones = await ClinicAttendanceZone.find({ doctor_id: doctorId }).sort({ clinic_name: 1 }).lean();
        return res.json({ success: true, zones });
    } catch (err) {
        console.error('listZones', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.upsertZone = async (req, res) => {
    try {
        const { doctor_id, clinic_id, clinic_name, latitude, longitude, radius_meters, enabled } = req.body;
        if (!doctor_id || !clinic_id || latitude == null || longitude == null) {
            return res.status(400).json({
                success: false,
                message: 'doctor_id, clinic_id, latitude, longitude are required',
            });
        }
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({ success: false, message: 'Invalid coordinates' });
        }
        const radius = radius_meters != null ? Math.min(2000, Math.max(30, Number(radius_meters))) : 150;
        const zone = await ClinicAttendanceZone.findOneAndUpdate(
            { doctor_id, clinic_id },
            {
                doctor_id,
                clinic_id,
                clinic_name: clinic_name || '',
                latitude: lat,
                longitude: lng,
                radius_meters: radius,
                enabled: enabled !== false,
                updatedAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return res.json({ success: true, zone });
    } catch (err) {
        console.error('upsertZone', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteZone = async (req, res) => {
    try {
        const { doctorId, clinicId } = req.params;
        await ClinicAttendanceZone.deleteOne({ doctor_id: doctorId, clinic_id: clinicId });
        return res.json({ success: true });
    } catch (err) {
        console.error('deleteZone', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.assistantCheck = async (req, res) => {
    try {
        const {
            assistant_id,
            assistant_name,
            assistant_email,
            doctor_id,
            clinic_id,
            action,
            latitude,
            longitude,
            accuracy_meters,
        } = req.body;

        if (!assistant_id || !doctor_id || !clinic_id || !action) {
            return res.status(400).json({
                success: false,
                message: 'assistant_id, doctor_id, clinic_id, action are required',
            });
        }
        if (!['sign_in', 'sign_out'].includes(action)) {
            return res.status(400).json({ success: false, message: 'action must be sign_in or sign_out' });
        }
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return res.status(400).json({ success: false, message: 'latitude and longitude required' });
        }

        const zone = await ClinicAttendanceZone.findOne({
            doctor_id,
            clinic_id,
            enabled: true,
        }).lean();

        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'No attendance zone configured for this clinic. Ask the doctor to set location in dashboard.',
            });
        }

        const dist = distanceMeters(lat, lng, zone.latitude, zone.longitude);
        const within = dist <= zone.radius_meters;

        if (!within) {
            return res.status(403).json({
                success: false,
                message: `You are outside the allowed clinic area (~${Math.round(dist)} m from center, limit ${zone.radius_meters} m). Move closer to the clinic.`,
                distance_meters: Math.round(dist),
                radius_meters: zone.radius_meters,
            });
        }

        const log = await AssistantAttendanceLog.create({
            assistant_id,
            assistant_name: assistant_name || '',
            assistant_email: assistant_email || '',
            doctor_id,
            clinic_id,
            clinic_name: zone.clinic_name || '',
            action,
            latitude: lat,
            longitude: lng,
            accuracy_meters: accuracy_meters != null ? Number(accuracy_meters) : undefined,
            distance_from_center_m: Math.round(dist * 100) / 100,
            within_zone: true,
            radius_meters_used: zone.radius_meters,
        });

        return res.status(201).json({
            success: true,
            log,
            message: action === 'sign_in' ? 'Signed in successfully' : 'Signed out successfully',
        });
    } catch (err) {
        console.error('assistantCheck', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.listLogs = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { from, to, clinic_id, assistant_id, limit } = req.query;
        if (!doctorId) return res.status(400).json({ success: false, message: 'doctorId required' });

        const q = { doctor_id: doctorId };
        if (clinic_id) q.clinic_id = clinic_id;
        if (assistant_id) q.assistant_id = assistant_id;

        if (from || to) {
            q.createdAt = {};
            if (from) q.createdAt.$gte = new Date(from);
            if (to) q.createdAt.$lte = new Date(to);
        }

        const lim = Math.min(2000, Math.max(50, parseInt(limit, 10) || 500));
        const logs = await AssistantAttendanceLog.find(q)
            .sort({ createdAt: -1 })
            .limit(lim)
            .lean();

        return res.json({ success: true, logs });
    } catch (err) {
        console.error('listLogs', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
