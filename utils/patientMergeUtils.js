const mongoose = require('mongoose');

/**
 * Mongo $addFields stage: same merge key as patientController (approximate normalized_name with $toLower+$trim).
 */
function mergeKeyAddFieldsStage() {
    return {
        $addFields: {
            __mk: {
                $cond: {
                    if: {
                        $and: [
                            { $ne: [{ $ifNull: ['$file_number', null] }, null] },
                            { $ne: [{ $ifNull: ['$file_number', ''] }, ''] },
                            { $ne: ['$file_number', 0] }
                        ]
                    },
                    then: {
                        $concat: [
                            { $toString: { $ifNull: ['$file_number', ''] } },
                            '::',
                            {
                                $ifNull: [
                                    '$normalized_phone',
                                    { $ifNull: ['$patient_phone', ''] }
                                ]
                            }
                        ]
                    },
                    else: {
                        $concat: [
                            { $ifNull: ['$patient_phone', ''] },
                            '::',
                            {
                                $toLower: {
                                    $trim: { input: { $ifNull: ['$patient_name', ''] } }
                                }
                            }
                        ]
                    }
                }
            }
        }
    };
}

/**
 * Merge duplicate Mongo patient docs (same person) — mirrors patientController merge logic.
 * @param {object[]} docsSorted — already in the same sort order as the original find
 * @param {object} [options]
 * @param {function} [options.filterVisits] — (visits) => visits
 */
function mergePatientDocuments(docsSorted, options = {}) {
    const { filterVisits = (v) => v } = options;
    if (!docsSorted || docsSorted.length === 0) return null;
    if (docsSorted.length === 1) {
        const p = { ...docsSorted[0] };
        const combined = _dedupeVisits([...(p.all_visits || []), ...(p.visits || [])]);
        p.visits = filterVisits(combined);
        p.all_visits = [];
        delete p.__mk;
        return p;
    }

    let existing = null;
    const mergeKeyFn = (patient) => {
        if (patient.file_number != null && patient.file_number !== '' && patient.file_number !== 0) {
            const normPhone =
                patient.normalized_phone ||
                _normalizePhone(patient.patient_phone) ||
                patient.patient_phone;
            return `${patient.file_number}::${normPhone}`;
        }
        const normName = patient.normalized_name || _normalizeName(patient.patient_name) || '';
        return `${patient.patient_phone}::${normName}`;
    };

    for (const rawPatient of docsSorted) {
        const patient = { ...rawPatient };
        delete patient.__mk;
        const mergeKey = mergeKeyFn(patient);

        const visitSeen = new Set();
        const combinedVisits = [];
        for (const v of [...(patient.all_visits || []), ...(patient.visits || [])]) {
            const vid = v.visit_id || v._id?.toString?.() || '';
            if (!vid || !visitSeen.has(vid)) {
                if (vid) visitSeen.add(vid);
                combinedVisits.push(v);
            }
        }
        const filteredVisits = filterVisits(combinedVisits);

        if (!existing) {
            patient.visits = filteredVisits || [];
            patient.all_visits = [];
            existing = patient;
            continue;
        }

        if (!existing.visits || !Array.isArray(existing.visits)) existing.visits = [];
        const existingIds = new Set(existing.visits.map((v) => v.visit_id || v._id?.toString?.() || ''));
        for (const v of filteredVisits) {
            const vid = v.visit_id || v._id?.toString?.() || '';
            if (!vid || !existingIds.has(vid)) {
                existingIds.add(vid);
                existing.visits.push(v);
            }
        }
        existing.visits.sort((a, b) => new Date(b.date || b.time || 0) - new Date(a.date || a.time || 0));

        const reportIds = new Set((existing.reports || []).map((r) => r.report_id || r._id?.toString?.() || ''));
        for (const r of patient.reports || []) {
            const rid = r.report_id || r._id?.toString?.() || '';
            if (!rid || !reportIds.has(rid)) {
                reportIds.add(rid);
                if (!existing.reports) existing.reports = [];
                existing.reports.push(r);
            }
        }

        const medIds = new Set((existing.medical_reports || []).map((r) => r.report_id || r._id?.toString?.() || ''));
        for (const r of patient.medical_reports || []) {
            const rid = r.report_id || r._id?.toString?.() || '';
            if (!rid || !medIds.has(rid)) {
                medIds.add(rid);
                if (!existing.medical_reports) existing.medical_reports = [];
                existing.medical_reports.push(r);
            }
        }

        const refIds = new Set((existing.referrals || []).map((r) => r.referral_id || r._id?.toString?.() || ''));
        for (const r of patient.referrals || []) {
            const rid = r.referral_id || r._id?.toString?.() || '';
            if (!rid || !refIds.has(rid)) {
                refIds.add(rid);
                if (!existing.referrals) existing.referrals = [];
                existing.referrals.push(r);
            }
        }

        const compIds = new Set((existing.complaint_history || []).map((c) => c._id?.toString?.() || ''));
        for (const c of patient.complaint_history || []) {
            const cid = c._id?.toString?.() || '';
            if (!cid || !compIds.has(cid)) {
                compIds.add(cid);
                if (!existing.complaint_history) existing.complaint_history = [];
                existing.complaint_history.push(c);
            }
        }

        const existingDate = new Date(existing.date || existing.createdAt || 0);
        const newDate = new Date(patient.date || patient.createdAt || 0);
        if (newDate > existingDate) {
            existing.patient_name = patient.patient_name || existing.patient_name;
            existing.age = patient.age || existing.age;
            existing.address = patient.address || existing.address;
            existing.fcmToken = patient.fcmToken || existing.fcmToken;
            existing.token = patient.token || existing.token;
            existing.status = patient.status || existing.status;
            existing.date = patient.date || existing.date;
            existing.time = patient.time || existing.time;
        }
    }

    delete existing.__mk;
    return existing;
}

function _dedupeVisits(visits) {
    const seen = new Set();
    const out = [];
    for (const v of visits) {
        const vid = v.visit_id || v._id?.toString?.() || '';
        if (!vid || !seen.has(vid)) {
            if (vid) seen.add(vid);
            out.push(v);
        }
    }
    return out;
}

function _normalizePhone(phone) {
    if (phone == null || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
}

function _normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Paginate logically merged patients without loading the full collection into Node.
 * @returns {Promise<{ totalItems: number, pageDocs: object[] }>}
 */
async function aggregateMergedPatientPage(Patient, matchFilter, options) {
    const {
        preMergeSort,
        postMergeSort,
        pageNum,
        limitNum,
        mergeOptions
    } = options;

    const skip = (pageNum - 1) * limitNum;

    const pipeline = [
        { $match: matchFilter },
        mergeKeyAddFieldsStage(),
        { $sort: preMergeSort },
        {
            $group: {
                _id: '$__mk',
                ids: { $push: '$_id' },
                firstDoc: { $first: '$$ROOT' }
            }
        },
        {
            $replaceRoot: {
                newRoot: {
                    $mergeObjects: ['$firstDoc', { __mergeIds: '$ids' }]
                }
            }
        },
        { $project: { __mk: 0 } },
        { $sort: postMergeSort },
        {
            $facet: {
                total: [{ $count: 'count' }],
                page: [{ $skip: skip }, { $limit: limitNum }]
            }
        }
    ];

    const agg = await Patient.aggregate(pipeline).allowDiskUse(true);
    const facet = agg[0] || {};
    const totalItems = facet.total && facet.total[0] ? facet.total[0].count : 0;
    const rawPage = facet.page || [];

    const pageDocs = [];
    for (const row of rawPage) {
        const ids = row.__mergeIds;
        delete row.__mergeIds;
        delete row.__mk;

        if (!ids || ids.length === 0) continue;

        if (ids.length === 1) {
            const merged = mergePatientDocuments([row], mergeOptions);
            if (merged) pageDocs.push(merged);
            continue;
        }

        const oidList = ids.map((id) =>
            id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
        );
        const full = await Patient.find({ _id: { $in: oidList } })
            .sort(preMergeSort)
            .lean();
        const merged = mergePatientDocuments(full, mergeOptions);
        if (merged) pageDocs.push(merged);
    }

    return { totalItems, pageDocs };
}

module.exports = {
    mergeKeyAddFieldsStage,
    mergePatientDocuments,
    aggregateMergedPatientPage
};
