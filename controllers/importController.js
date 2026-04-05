const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const Patient = require('../models/patient');
const LegacyImport = require('../models/LegacyImport');

function safeStr(val) {
    if (val == null || val === undefined) return '';
    return String(val).trim();
}

function safeNum(val) {
    if (val == null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
}

function parseDate(val) {
    if (val == null || val === undefined || val === '') return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

function stripMobilePrefix(val) {
    const s = safeStr(val);
    return s.replace(/^M:\s*/i, '').trim();
}

function normalizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
}

function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function readSheetSafe(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    try {
        return XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } catch (e) {
        console.warn(`Failed to parse sheet "${sheetName}":`, e.message);
        return [];
    }
}

/**
 * POST /api/import/legacy
 * Accepts multipart form with:
 *   - file: .xlsx file
 *   - doctor_id: string (required)
 *   - doctor_name: string (optional)
 *   - clinic_id: string (optional)
 */
const importLegacyData = async (req, res) => {
    const batchId = uuidv4();
    const summary = {
        import_batch_id: batchId,
        patients: { total: 0, imported: 0, skipped: 0 },
        visits: { total: 0, imported: 0, skipped: 0 },
        investigations: { total: 0 },
        medications: { total: 0 },
        physiotherapy: { total: 0 },
        emergency_contacts: { total: 0 },
        errors: []
    };

    try {
        const { doctor_id, doctor_name, clinic_id } = req.body;

        if (!doctor_id) {
            return res.status(400).json({ success: false, message: 'doctor_id is required' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Excel file is required' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sourceFileName = req.file.originalname || 'unknown.xlsx';

        const patientsRows = readSheetSafe(workbook, 'Patients');
        const emergencyRows = readSheetSafe(workbook, 'Emergency Contacts');
        const visitsRows = readSheetSafe(workbook, 'Visits');
        const investigationsRows = readSheetSafe(workbook, 'Investigations');
        const medicationsRows = readSheetSafe(workbook, 'Medications');
        const physioRows = readSheetSafe(workbook, 'Physiotherapy');

        summary.patients.total = patientsRows.length;
        summary.visits.total = visitsRows.length;
        summary.investigations.total = investigationsRows.length;
        summary.medications.total = medicationsRows.length;
        summary.physiotherapy.total = physioRows.length;
        summary.emergency_contacts.total = emergencyRows.length;

        // Group child rows by patient ID for fast lookup
        const emergencyByPatient = groupBy(emergencyRows, r => safeStr(r['PatientsID']));
        const visitsByPatient = groupBy(visitsRows, r => safeStr(r['PatientsID']));
        const investigationsByPatient = groupBy(investigationsRows, r => safeStr(r['PatientsID']));
        const medicationsByPatient = groupBy(medicationsRows, r => safeStr(r['PatientsID']));
        const physioByPatient = groupBy(physioRows, r => safeStr(r['PatientsID']));

        // Also group investigations/medications/physio by visit ID for nesting
        const investigationsByVisit = groupBy(investigationsRows, r => safeStr(r['PatientsVisitsInvestigationsPatientsVisitsServicesID']));
        const medicationsByVisit = groupBy(medicationsRows, r => safeStr(r['PatientsVisitsTreatmentsPatientsVisitsID']));
        const physioByVisit = groupBy(physioRows, r => safeStr(r['PatientsVisitsid']));

        // Smaller chunks + event-loop yield reduce peak RAM on Heroku (R14) during large imports
        const CHUNK_SIZE = 25;
        for (let i = 0; i < patientsRows.length; i += CHUNK_SIZE) {
            const chunk = patientsRows.slice(i, i + CHUNK_SIZE);
            await processPatientChunk(chunk, {
                doctor_id,
                doctor_name: doctor_name || '',
                clinic_id: clinic_id || '',
                batchId,
                sourceFileName,
                visitsByPatient,
                emergencyByPatient,
                investigationsByPatient,
                medicationsByPatient,
                physioByPatient,
                investigationsByVisit,
                medicationsByVisit,
                physioByVisit,
                summary
            });
            await new Promise((resolve) => setImmediate(resolve));
        }

        return res.status(200).json({
            success: true,
            message: 'Import completed',
            summary
        });

    } catch (error) {
        console.error('Import failed:', error);
        summary.errors.push({ row: 'global', message: error.message });
        return res.status(200).json({
            success: false,
            message: 'Import completed with errors',
            summary
        });
    }
};

async function processPatientChunk(rows, ctx) {
    for (const row of rows) {
        try {
            await processOnePatient(row, ctx);
        } catch (err) {
            const legacyId = safeStr(row['PatientsID']);
            console.error(`Error importing patient ${legacyId}:`, err.message);
            ctx.summary.errors.push({
                row: legacyId,
                type: 'patient',
                message: err.message
            });
            ctx.summary.patients.skipped++;
        }
    }
}

async function processOnePatient(row, ctx) {
    const legacyId = safeStr(row['PatientsID']);
    if (!legacyId) {
        ctx.summary.patients.skipped++;
        return;
    }

    const patientId = legacyId;
    const rawMobile = stripMobilePrefix(row['Mobile']);
    const rawPhone = safeStr(row['Phone']);
    const phone = rawMobile || rawPhone || '';
    const name = safeStr(row['PatientsName']) || 'Unknown';
    const normalized = normalizePhone(phone);
    const normalizedN = normalizeName(name);

    const age = safeStr(row['PatientsAge']);
    const address = safeStr(row['PatientsAddress']);
    const fileNumber = safeStr(row['PatientsFileNumber']);

    // Build visits for the patient schema (embedded visits array)
    const patientVisitRows = ctx.visitsByPatient[legacyId] || [];
    const visits = [];

    for (const vRow of patientVisitRows) {
        try {
            const legacyVisitId = safeStr(vRow['PatientsVisitsID']);
            const visitId = legacyVisitId || uuidv4();
            const visitDate = parseDate(vRow['Created']) || new Date();
            const complaint = safeStr(vRow['VisitsChiefComplaint']);
            const diagnosis = safeStr(vRow['VisitsDiagnosis']);
            const visitType = safeStr(vRow['VisitsCategory']) || safeStr(vRow['VisitsCategorySub']) || 'كشف';

            // Build receipts from medications linked to this visit
            const visitMeds = ctx.medicationsByVisit[legacyVisitId] || [];
            const drugs = visitMeds.map(m => ({
                drug: safeStr(m['PatientsVisitsTreatmentsDrugName']),
                frequency: safeStr(m['PatientsVisitsTreatmentsFrequency']),
                period: safeStr(m['PatientsVisitsTreatmentsDuration']),
                timing: safeStr(m['PatientsVisitsTreatmentsDosage']),
                form: safeStr(m['PatientsVisitsTreatmentsForm']),
                route: safeStr(m['PatientsVisitsTreatmentsRoute'])
            }));

            const receipts = drugs.length > 0 ? [{
                drugs,
                notes: safeStr(vRow['VisitsNotes']),
                date: visitDate,
                drugModel: 'legacy'
            }] : [];

            const time = visitDate instanceof Date
                ? visitDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : '';

            visits.push({
                visit_id: visitId,
                date: visitDate,
                time,
                visit_type: visitType,
                complaint,
                diagnosis,
                receipts
            });

            ctx.summary.visits.imported++;
        } catch (vErr) {
            ctx.summary.visits.skipped++;
            ctx.summary.errors.push({
                row: safeStr(vRow['PatientsVisitsID']),
                type: 'visit',
                message: vErr.message
            });
        }
    }

    // Sort visits newest first
    visits.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const createdAt = parseDate(row['Created']) || new Date();
    const latestVisitDate = visits.length > 0 ? visits[0].date : createdAt;
    const dateStr = latestVisitDate instanceof Date
        ? latestVisitDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    const patientDoc = new Patient({
        patient_name: name,
        patient_phone: phone,
        normalized_phone: normalized,
        normalized_name: normalizedN,
        patient_id: patientId,
        doctor_id: ctx.doctor_id,
        doctor_name: ctx.doctor_name,
        clinic_id: ctx.clinic_id,
        date: dateStr,
        time: '',
        status: 'COMPLETED',
        position: 0,
        age,
        address,
        visit_type: 'كشف',
        file_number: fileNumber || null,
        visits,
        all_visits: [],
        total_visits: visits.length
    });

    await patientDoc.save();

    // Store full legacy data (all columns + child tables) for audit / future use
    const legacyDoc = new LegacyImport({
        import_batch_id: ctx.batchId,
        doctor_id: ctx.doctor_id,
        clinic_id: ctx.clinic_id,
        source_file_name: ctx.sourceFileName,
        legacy_patient_id: legacyId,
        patient_mongo_id: patientDoc._id.toString(),
        patient_id: patientId,
        patient_data: row,
        emergency_contacts: ctx.emergencyByPatient[legacyId] || [],
        visits: ctx.visitsByPatient[legacyId] || [],
        investigations: ctx.investigationsByPatient[legacyId] || [],
        medications: ctx.medicationsByPatient[legacyId] || [],
        physiotherapy: ctx.physioByPatient[legacyId] || []
    });

    await legacyDoc.save();

    ctx.summary.patients.imported++;
}

function groupBy(rows, keyFn) {
    const map = {};
    for (const row of rows) {
        const key = keyFn(row);
        if (!key) continue;
        if (!map[key]) map[key] = [];
        map[key].push(row);
    }
    return map;
}

/**
 * GET /api/import/batches?doctor_id=xxx
 * List import batches for a doctor
 */
const getImportBatches = async (req, res) => {
    try {
        const { doctor_id } = req.query;
        if (!doctor_id) {
            return res.status(400).json({ success: false, message: 'doctor_id is required' });
        }

        const batches = await LegacyImport.aggregate([
            { $match: { doctor_id } },
            {
                $group: {
                    _id: '$import_batch_id',
                    source_file_name: { $first: '$source_file_name' },
                    patient_count: { $sum: 1 },
                    imported_at: { $min: '$createdAt' }
                }
            },
            { $sort: { imported_at: -1 } }
        ]);

        return res.status(200).json({ success: true, batches });
    } catch (error) {
        console.error('Error fetching import batches:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/import/batches/:batchId
 * Rollback: delete all patients and legacy records from a specific import batch
 */
const rollbackImportBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { doctor_id } = req.query;

        if (!batchId || !doctor_id) {
            return res.status(400).json({ success: false, message: 'batchId and doctor_id are required' });
        }

        const legacyDocs = await LegacyImport.find({
            import_batch_id: batchId,
            doctor_id
        }).lean();

        const mongoIds = legacyDocs
            .map(d => d.patient_mongo_id)
            .filter(Boolean);

        let patientsDeleted = 0;
        if (mongoIds.length > 0) {
            const result = await Patient.deleteMany({ _id: { $in: mongoIds } });
            patientsDeleted = result.deletedCount || 0;
        }

        const legacyResult = await LegacyImport.deleteMany({
            import_batch_id: batchId,
            doctor_id
        });

        return res.status(200).json({
            success: true,
            message: 'Batch rolled back',
            patientsDeleted,
            legacyRecordsDeleted: legacyResult.deletedCount || 0
        });
    } catch (error) {
        console.error('Error rolling back batch:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    importLegacyData,
    getImportBatches,
    rollbackImportBatch
};
