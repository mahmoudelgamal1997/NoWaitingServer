const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const Billing = require('../models/billing');
const ExternalServiceRequest = require('../models/externalServiceRequest');
const VisitTypeConfiguration = require('../models/VisitTypeConfiguration');
const { v4: uuidv4 } = require('uuid');

/**
 * Convert 12h "HH:MM AM/PM" to 24h "HH:MM" for API response.
 * Dashboards that parse the hour as 24h and use (hour >= 12 ? 'PM' : 'AM') will then display correctly.
 * Leaves other formats (e.g. already 24h "17:52") unchanged.
 */
function timeTo24hForResponse(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr || '';
    const trimmed = timeStr.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return timeStr;
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const period = (match[3] || '').toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
}

function normalizePatientTimeForResponse(p) {
    const po = (p.toObject && typeof p.toObject === 'function') ? p.toObject() : p;
    return {
        ...po,
        time: timeTo24hForResponse(po.time),
        visits: (po.visits || []).map(v => ({ ...v, time: timeTo24hForResponse(v.time) })),
        all_visits: (po.all_visits || []).map(v => ({ ...v, time: timeTo24hForResponse(v.time) }))
    };
}

// Normalize phone for matching: digits only, last 10 digits (Egyptian numbers)
// So "01234567890", "201234567890", "1234567890" all become "1234567890"
function normalizePhone(phone) {
    if (phone == null || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
}

// Normalize name for matching: trimmed, single-spaced, lowercased
function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Mongoose doc or lean object → plain object (lean queries use far less RAM on large lists). */
function toPlainPatientDoc(raw) {
    if (raw == null) return raw;
    return typeof raw.toObject === 'function' ? raw.toObject() : { ...raw };
}

// Levenshtein-based similarity in [0,1]; 1 = identical
function nameSimilarity(a, b) {
    const s1 = (a || '').trim().replace(/\s+/g, ' ');
    const s2 = (b || '').trim().replace(/\s+/g, ' ');
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;
    const len1 = s1.length, len2 = s2.length;
    const dp = Array.from({ length: len1 + 1 }, (_, i) =>
        Array.from({ length: len2 + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= len1; i++)
        for (let j = 1; j <= len2; j++)
            dp[i][j] = s1[i - 1] === s2[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return 1 - dp[len1][len2] / Math.max(len1, len2);
}

// Generate a unique 5-digit file number not already used in the collection
const generateFileNumber = async () => {
    let fileNumber;
    let attempts = 0;
    do {
        fileNumber = String(Math.floor(10000 + Math.random() * 90000));
        const exists = await Patient.findOne({ file_number: fileNumber }).lean();
        if (!exists) return fileNumber;
        attempts++;
    } while (attempts < 20);
    // Extremely unlikely, but fall back to a timestamped value
    return String(Date.now()).slice(-5);
};

/**
 * Parse clinic scope parameters from a request (query or body).
 * Returns { useClinicScope: boolean, clinicIds: string[] }.
 * When useClinicScope is false, clinicIds is empty and ALL existing code paths remain
 * completely unchanged — this is the default for every existing single-doctor clinic.
 */
function parseClinicScope(req) {
    const rawScope = req.query.use_clinic_scope || (req.body && req.body.use_clinic_scope);
    const useClinicScope = rawScope === 'true' || rawScope === true;
    if (!useClinicScope) return { useClinicScope: false, clinicIds: [] };

    let clinicIds = [];
    const raw = req.query.clinic_ids || (req.body && req.body.clinic_ids);
    if (Array.isArray(raw)) {
        clinicIds = raw.filter(Boolean);
    } else if (typeof raw === 'string' && raw.trim()) {
        clinicIds = raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    // Fall back to single clinic_id if clinic_ids not provided
    const singleClinicId = req.query.clinic_id || (req.body && req.body.clinic_id);
    if (clinicIds.length === 0 && singleClinicId) {
        clinicIds = [singleClinicId];
    }
    return { useClinicScope: clinicIds.length > 0, clinicIds };
}

/**
 * Merge multiple patient documents (from different doctors/branches) into one
 * logical patient response for clinic-scope queries.
 * The doc with a file_number is used as the canonical base.
 * Visits and complaint_history are merged and deduped across all docs.
 */
function mergePatientsToOne(patientDocs) {
    if (!patientDocs || patientDocs.length === 0) return null;
    const docs = patientDocs.map(p =>
        (p.toObject && typeof p.toObject === 'function') ? p.toObject() : { ...p }
    );
    // Prefer doc with file_number as base; otherwise most recently created
    docs.sort((a, b) => {
        if (a.file_number && !b.file_number) return -1;
        if (!a.file_number && b.file_number) return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    const base = { ...docs[0] };

    // Merge visits + all_visits from all docs, deduped by visit_id
    const visitSeen = new Set();
    const mergedVisits = [];
    for (const doc of docs) {
        for (const v of [...(doc.all_visits || []), ...(doc.visits || [])]) {
            const vid = v.visit_id || v._id?.toString?.() || '';
            if (!vid || !visitSeen.has(vid)) {
                if (vid) visitSeen.add(vid);
                mergedVisits.push(v);
            }
        }
    }
    mergedVisits.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    base.visits = mergedVisits;
    base.all_visits = [];

    // Merge complaint_history from all docs, deduped by _id
    const complaintSeen = new Set();
    const mergedComplaints = [];
    for (const doc of docs) {
        for (const c of (doc.complaint_history || [])) {
            const cid = c._id?.toString?.() || '';
            if (!cid || !complaintSeen.has(cid)) {
                if (cid) complaintSeen.add(cid);
                mergedComplaints.push(c);
            }
        }
    }
    mergedComplaints.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    base.complaint_history = mergedComplaints;

    return base;
}

/**
 * Resolve the consultation fee and display label for a given visit_type.
 * Priority:
 *   1. VisitTypeConfiguration (supports custom visit types added by doctor)
 *   2. Doctor.settings (legacy simple-mode: consultationFee / revisitFee / estisharaFee)
 *   3. 0 (no fee configured)
 */
const resolveVisitTypeFee = async (doctor_id, visit_type, visit_speed, doctor) => {
    const isUrgent = visit_speed === 'سريع' || visit_speed === 'urgent';

    // 1. Check VisitTypeConfiguration
    try {
        const vtConfig = await VisitTypeConfiguration.findOne({ doctor_id });
        if (vtConfig && vtConfig.visit_types && vtConfig.visit_types.length > 0) {
            const match = vtConfig.visit_types.find(
                (vt) =>
                    vt.is_active !== false &&
                    (vt.type_id === visit_type ||
                        vt.name_ar === visit_type ||
                        vt.name === visit_type)
            );
            if (match) {
                const fee = isUrgent
                    ? (match.urgent_price || match.normal_price || 0)
                    : (match.normal_price || 0);
                if (fee > 0) {
                    return { fee, type: match.name_ar || match.name };
                }
            }
        }
    } catch (err) {
        console.warn('resolveVisitTypeFee: VisitTypeConfiguration lookup failed:', err.message);
    }

    // 2. Fall back to doctor settings (standard types)
    if (doctor && doctor.settings) {
        const isRevisit = visit_type === 'اعاده كشف' || visit_type === 'إعادة كشف';
        const isEstishara = visit_type === 'استشارة';
        let fee = 0;
        if (isRevisit) {
            fee = doctor.settings.revisitFee || 0;
        } else if (isEstishara) {
            fee = doctor.settings.estisharaFee || 0;
        } else {
            fee = doctor.settings.consultationFee || 0;
        }
        return { fee, type: visit_type || 'كشف' };
    }

    return { fee: 0, type: visit_type || 'كشف' };
};

// Save patient data or add a new visit if patient already exists
const savePatient = async (req, res) => {
    try {
        const {
            patient_name,
            patient_phone,
            patient_id,
            doctor_id,
            doctor_name,
            date,
            time,
            status,
            position,
            fcmToken,
            token,
            age,
            address,
            visit_type,
            complaint = "", // Added for initial visit
            diagnosis = "",  // Added for initial visit
            all_visits = [],
            user_order_in_queue,
            total_visits = 0,
            user_uid = "",
            visit_speed = "",
            clinic_id = "",
            assistant_id = "",
            file_number: providedFileNumber = ""
        } = req.body;


        // Validation for required doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // If doctor_name is not provided, try to fetch it from Doctor collection
        let resolvedDoctorName = doctor_name;
        if (!resolvedDoctorName) {
            try {
                const doctor = await Doctor.findOne({ doctor_id });
                if (doctor && doctor.name) {
                    resolvedDoctorName = doctor.name;
                }
            } catch (error) {
                console.warn('Could not fetch doctor name:', error.message);
                // Continue with empty doctor_name if lookup fails
            }
        }

        const trimmedFileNumber = (providedFileNumber || '').toString().trim();
        const normalized = normalizePhone(patient_phone);
        const normalizedPatientName = normalizeName(patient_name);

        // Match by file_number + phone first — most reliable identifier for returning patients.
        // The assistant portal resolves the file_number before calling savePatient,
        // so even if the name was typed slightly differently, the same file_number
        // means it's the same person and we must reuse the existing record.
        // We also verify the phone matches to avoid merging different people who
        // accidentally share the same file_number.
        let existingPatient = null;
        if (trimmedFileNumber && normalized) {
            const fnCandidates = await Patient.find({ doctor_id, file_number: trimmedFileNumber });
            existingPatient = fnCandidates.find(p => {
                const pNorm = p.normalized_phone || normalizePhone(p.patient_phone);
                return pNorm === normalized;
            }) || null;
        }
        // Fall back to phone + name similarity matching
        if (!existingPatient && normalized) {
            const phoneMatches = await Patient.find({ doctor_id, normalized_phone: normalized });
            existingPatient = phoneMatches.find((p) => {
                // If the stored record has a normalized_name, use similarity check
                const storedName = p.normalized_name || normalizeName(p.patient_name);
                return nameSimilarity(normalizedPatientName, storedName) >= 0.95;
            }) || null;
        }
        if (!existingPatient) {
            const exactMatches = await Patient.find({ doctor_id, patient_phone });
            existingPatient = exactMatches.find((p) => {
                const storedName = p.normalized_name || normalizeName(p.patient_name);
                return nameSimilarity(normalizedPatientName, storedName) >= 0.95;
            }) || null;
        }
        if (!existingPatient && normalized) {
            const candidates = await Patient.find(
                { doctor_id, $or: [{ normalized_phone: '' }, { normalized_phone: { $exists: false } }] }
            ).limit(2000).lean();
            const match = candidates.find((p) => {
                if (normalizePhone(p.patient_phone) !== normalized) return false;
                const storedName = p.normalized_name || normalizeName(p.patient_name);
                return nameSimilarity(normalizedPatientName, storedName) >= 0.95;
            });
            if (match) {
                existingPatient = await Patient.findById(match._id);
                if (existingPatient) {
                    existingPatient.normalized_phone = normalized;
                    if (!existingPatient.normalized_name) {
                        existingPatient.normalized_name = normalizeName(existingPatient.patient_name);
                    }
                    await existingPatient.save();
                }
            }
        }

        // CLINIC SCOPE: When enabled, look across all branches for same phone to reuse file_number.
        // This runs only if the patient was NOT found under this specific doctor above.
        let sharedFileNumber = null;
        if (!existingPatient && normalized) {
            const { useClinicScope: saveScope, clinicIds: saveClinicIds } = parseClinicScope(req);
            if (saveScope) {
                const clinicScopePatient = await Patient.findOne({
                    clinic_id: { $in: saveClinicIds },
                    normalized_phone: normalized
                }).lean();
                if (clinicScopePatient && clinicScopePatient.file_number) {
                    sharedFileNumber = clinicScopePatient.file_number;
                }
            }
        }

        if (existingPatient) {
            // Generate a unique visit ID
            const visit_id = uuidv4();

            // Create a new visit record for the existing patient
            const newVisit = {
                visit_id,
                date: date || new Date(),
                time: time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                visit_type: visit_type || "كشف",
                complaint,
                diagnosis,
                receipts: []
            };

            // Add the new visit to the patient's visits array
            existingPatient.visits.push(newVisit);

            // Update patient status and position if provided
            if (status) existingPatient.status = status;
            if (position) existingPatient.position = position;

            // Always update the top-level date/time to the current visit date so the
            // dashboard date filter (which reads patient.date) shows returning patients
            // correctly in today's list instead of filtering them out by their original
            // registration date.
            if (date) existingPatient.date = date;
            if (time) existingPatient.time = time;

            // Update other patient info if provided (might have changed)
            if (patient_name) existingPatient.patient_name = patient_name;
            if (age) existingPatient.age = age;
            if (address) existingPatient.address = address;
            if (fcmToken) existingPatient.fcmToken = fcmToken;
            if (token) existingPatient.token = token;
            // Update new fields if provided
            if (user_order_in_queue !== undefined) existingPatient.user_order_in_queue = user_order_in_queue;
            if (total_visits !== undefined) existingPatient.total_visits = total_visits;
            if (user_uid !== undefined) existingPatient.user_uid = user_uid;
            if (visit_speed !== undefined) existingPatient.visit_speed = visit_speed;
            if (clinic_id !== undefined) existingPatient.clinic_id = clinic_id;
            if (assistant_id !== undefined) existingPatient.assistant_id = assistant_id;
            if (all_visits !== undefined && Array.isArray(all_visits)) existingPatient.all_visits = all_visits;
            // Update doctor_name if we resolved it or if it was provided
            if (resolvedDoctorName) {
                existingPatient.doctor_name = resolvedDoctorName;
            }
            if (normalized && !existingPatient.normalized_phone) {
                existingPatient.normalized_phone = normalized;
            }
            if (normalizedPatientName && !existingPatient.normalized_name) {
                existingPatient.normalized_name = normalizedPatientName;
            }

            await existingPatient.save();

            // Auto-record consultation fee if doctor has set fees
            try {
                const doctor = await Doctor.findOne({ doctor_id });
                const { fee: consultationFee, type: consultationType } =
                    await resolveVisitTypeFee(doctor_id, visit_type, visit_speed, doctor);

                if (consultationFee > 0) {
                    // Deduplication guard: prevent double-billing from retries or multi-app processing.
                    // Skip if a billing was already created for this patient+doctor in the last 5 minutes.
                    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                    const recentBilling = await Billing.findOne({
                        patient_id: existingPatient.patient_id,
                        doctor_id,
                        billingDate: { $gte: fiveMinutesAgo }
                    });

                    if (recentBilling) {
                        console.log(`Skipping duplicate billing for ${existingPatient.patient_name} - already recorded within last 5 minutes`);
                    } else {
                        const billing = new Billing({
                            billing_id: uuidv4(),
                            doctor_id,
                            patient_id: existingPatient.patient_id,
                            patient_name: existingPatient.patient_name,
                            patient_phone: existingPatient.patient_phone || "",
                            visit_id: visit_id,
                            clinic_id: clinic_id || "",
                            consultationFee: consultationFee,
                            consultationType: consultationType,
                            services: [],
                            servicesTotal: 0,
                            subtotal: consultationFee,
                            discount: null,
                            totalAmount: consultationFee,
                            paymentStatus: 'paid',
                            paymentMethod: 'cash',
                            amountPaid: consultationFee,
                            notes: "Consultation fee - auto recorded on patient arrival",
                            billingDate: new Date()
                        });
                        await billing.save();
                        console.log(`Consultation fee ${consultationFee} EGP (${consultationType}) recorded for ${existingPatient.patient_name}`);
                    }
                }
            } catch (billingError) {
                console.error('Error auto-recording consultation fee:', billingError);
                // Don't fail the patient save if billing fails
            }

            return res.status(200).json({
                message: 'New visit added for existing patient',
                patient: existingPatient,
                visit: newVisit
            });
        }

        // If patient doesn't exist, create a new patient.
        // Priority: frontend-provided > shared from another branch > newly generated.
        const newFileNumber = trimmedFileNumber || sharedFileNumber || await generateFileNumber();
        const newPatient = new Patient({
            patient_name,
            patient_phone,
            normalized_phone: normalized || '',
            normalized_name: normalizedPatientName || '',
            patient_id: patient_id || uuidv4(), // Generate patient_id if not provided
            doctor_id,
            file_number: newFileNumber,
            doctor_name: resolvedDoctorName || doctor_name || '',
            date,
            time,
            status,
            position,
            fcmToken,
            token,
            age,
            address,
            visit_type,
            all_visits: all_visits || [],
            user_order_in_queue: user_order_in_queue || 0,
            total_visits: total_visits || 0,
            user_uid: user_uid || "",
            visit_speed: visit_speed || "",
            clinic_id: clinic_id || "",
            assistant_id: assistant_id || "",
            visits: [{
                visit_id: uuidv4(),
                date: date || new Date(),
                time: time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                visit_type: visit_type || "كشف",
                complaint,
                diagnosis,
                receipts: []
            }]
        });

        await newPatient.save();

        // Auto-record consultation fee for new patient if doctor has set fees
        try {
            const doctor = await Doctor.findOne({ doctor_id });
            const { fee: consultationFee, type: consultationType } =
                await resolveVisitTypeFee(doctor_id, visit_type, visit_speed, doctor);

            if (consultationFee > 0) {
                // Deduplication guard: in case this is a retry and the patient was already
                // saved + billed by the first request (which the client timed out waiting for).
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                const recentBilling = await Billing.findOne({
                    patient_id: newPatient.patient_id,
                    doctor_id,
                    billingDate: { $gte: fiveMinutesAgo }
                });

                if (recentBilling) {
                    console.log(`Skipping duplicate billing for new patient ${newPatient.patient_name} - already recorded within last 5 minutes`);
                } else {
                    const billing = new Billing({
                        billing_id: uuidv4(),
                        doctor_id,
                        patient_id: newPatient.patient_id,
                        patient_name: newPatient.patient_name,
                        patient_phone: newPatient.patient_phone || "",
                        visit_id: newPatient.visits[0]?.visit_id || "",
                        clinic_id: clinic_id || "",
                        consultationFee: consultationFee,
                        consultationType: consultationType,
                        services: [],
                        servicesTotal: 0,
                        subtotal: consultationFee,
                        discount: null,
                        totalAmount: consultationFee,
                        paymentStatus: 'paid',
                        paymentMethod: 'cash',
                        amountPaid: consultationFee,
                        notes: "Consultation fee - auto recorded on patient arrival",
                        billingDate: new Date()
                    });
                    await billing.save();
                    console.log(`Consultation fee ${consultationFee} EGP (${consultationType}) recorded for new patient ${newPatient.patient_name}`);
                }
            }
        } catch (billingError) {
            console.error('Error auto-recording consultation fee for new patient:', billingError);
            // Don't fail the patient save if billing fails
        }

        res.status(201).json({
            message: 'New patient created successfully',
            patient: newPatient
        });
    } catch (error) {
        console.error('Error saving patient:', error);

        res.status(500).json({
            message: 'Error saving patient',
            error: error.message
        });
    }
};

// Get patients for a specific doctor with optional filters, pagination, and search
const getPatientsByDoctor = async (req, res) => {
    try {
        const { doctor_id } = req.params;

        // Validate doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // Extract query parameters
        const {
            page,
            limit,
            search,
            startDate,
            endDate,
            status,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        // Build the query filter
        const queryFilter = { doctor_id };

        // Add status filter if provided
        if (status) {
            queryFilter.status = status;
        }

        // Note: startDate/endDate are now only used to filter visits, not patients
        // Patients should be returned regardless of their date field if they match doctor_id
        // Date filtering on patient records is deprecated - use visit date filtering instead

        // Build search filter for patient name, phone, or file number
        if (search) {
            queryFilter.$or = [
                { patient_name: { $regex: search, $options: 'i' } },
                { patient_phone: { $regex: search, $options: 'i' } },
                { file_number: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort object
        const sortObject = {};
        if (sortBy === 'date') {
            sortObject.date = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'name') {
            sortObject.patient_name = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'createdAt') {
            sortObject.createdAt = sortOrder === 'asc' ? 1 : -1;
        } else {
            // Default to date descending
            sortObject.date = -1;
        }

        // Check if pagination is requested
        const usePagination = page !== undefined || limit !== undefined;

        // IMPORTANT: For proper merging by phone number, we need to fetch all patients first
        // then merge, then paginate. This ensures accurate grouping.
        // Fetch all matching patients first (lean: lower memory vs full Mongoose documents)
        let allPatients = await Patient.find(queryFilter).sort(sortObject).lean();

        // Determine the max date for filtering visits
        // If endDate is provided, use it; otherwise use today
        let maxDateForVisits;
        if (endDate) {
            maxDateForVisits = new Date(endDate);
            maxDateForVisits.setHours(23, 59, 59, 999); // Include the full end date
        } else {
            maxDateForVisits = new Date();
            maxDateForVisits.setHours(23, 59, 59, 999); // Include today
        }
        const maxDateStr = maxDateForVisits.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Helper function to filter visits based on date range
        const filterVisitsByDate = (visits, maxDate = maxDateStr) => {
            if (!visits || !Array.isArray(visits)) return [];
            const filtered = visits.filter(visit => {
                if (!visit.date) return true; // Keep visits without date
                try {
                    // Handle both Date objects and ISO strings
                    let visitDate;
                    if (visit.date instanceof Date) {
                        visitDate = new Date(visit.date);
                    } else {
                        visitDate = new Date(visit.date);
                    }

                    // Check if date is valid
                    if (isNaN(visitDate.getTime())) {
                        console.warn('Invalid visit date:', visit.date);
                        return true; // Keep invalid dates for now
                    }
                    visitDate.setHours(0, 0, 0, 0);
                    const visitDateStr = visitDate.toISOString().split('T')[0];

                    // Apply startDate filter if provided
                    if (startDate) {
                        const startDateStr = startDate.split('T')[0];
                        if (visitDateStr < startDateStr) {
                            return false; // Filter out visits before startDate
                        }
                    }

                    // Only include visits up to maxDate (endDate if provided, or today)
                    const isFuture = visitDateStr > maxDate;
                    if (isFuture) {
                        return false; // Filter out future dates beyond maxDate
                    }
                    return true;
                } catch (error) {
                    console.error('Error filtering visit date:', error, visit);
                    return true; // Keep visit if date parsing fails
                }
            });
            return filtered;
        };

        // Group patients by identity and merge duplicate records for the SAME person.
        // Merge key = file_number + phone so that:
        //   - Same file_number + same phone = merged (same person, duplicate docs)
        //   - Same file_number + different phone = NOT merged (different people, accidental same file_number)
        //   - Different file_number + same phone = NOT merged (family members sharing a phone)
        const patientsMap = new Map();

        allPatients.forEach(rawPatient => {
            const patient = toPlainPatientDoc(rawPatient);

            let mergeKey;
            if (patient.file_number) {
                const normPhone = patient.normalized_phone || normalizePhone(patient.patient_phone) || patient.patient_phone;
                mergeKey = `${patient.file_number}::${normPhone}`;
            } else {
                const normName = patient.normalized_name || normalizeName(patient.patient_name) || '';
                mergeKey = `${patient.patient_phone}::${normName}`;
            }

            // Combine visits + all_visits and dedup by visit_id
            const visitSeen = new Set();
            const combinedVisits = [];
            for (const v of [...(patient.all_visits || []), ...(patient.visits || [])]) {
                const vid = v.visit_id || v._id?.toString?.() || '';
                if (!vid || !visitSeen.has(vid)) {
                    if (vid) visitSeen.add(vid);
                    combinedVisits.push(v);
                }
            }
            const filteredVisits = filterVisitsByDate(combinedVisits);

            if (patientsMap.has(mergeKey)) {
                const existingPatient = patientsMap.get(mergeKey);
                if (!existingPatient.visits || !Array.isArray(existingPatient.visits)) {
                    existingPatient.visits = [];
                }

                // Dedup-merge visits
                const existingIds = new Set(existingPatient.visits.map(v => v.visit_id || v._id?.toString?.() || ''));
                for (const v of filteredVisits) {
                    const vid = v.visit_id || v._id?.toString?.() || '';
                    if (!vid || !existingIds.has(vid)) {
                        existingIds.add(vid);
                        existingPatient.visits.push(v);
                    }
                }
                existingPatient.visits.sort((a, b) => {
                    const dateA = new Date(a.date || a.time || 0);
                    const dateB = new Date(b.date || b.time || 0);
                    return dateB - dateA;
                });

                // Merge reports
                const reportIds = new Set((existingPatient.reports || []).map(r => r.report_id || r._id?.toString?.() || ''));
                for (const r of (patient.reports || [])) {
                    const rid = r.report_id || r._id?.toString?.() || '';
                    if (!rid || !reportIds.has(rid)) {
                        reportIds.add(rid);
                        if (!existingPatient.reports) existingPatient.reports = [];
                        existingPatient.reports.push(r);
                    }
                }

                // Merge medical_reports
                const medIds = new Set((existingPatient.medical_reports || []).map(r => r.report_id || r._id?.toString?.() || ''));
                for (const r of (patient.medical_reports || [])) {
                    const rid = r.report_id || r._id?.toString?.() || '';
                    if (!rid || !medIds.has(rid)) {
                        medIds.add(rid);
                        if (!existingPatient.medical_reports) existingPatient.medical_reports = [];
                        existingPatient.medical_reports.push(r);
                    }
                }

                // Merge referrals
                const refIds = new Set((existingPatient.referrals || []).map(r => r.referral_id || r._id?.toString?.() || ''));
                for (const r of (patient.referrals || [])) {
                    const rid = r.referral_id || r._id?.toString?.() || '';
                    if (!rid || !refIds.has(rid)) {
                        refIds.add(rid);
                        if (!existingPatient.referrals) existingPatient.referrals = [];
                        existingPatient.referrals.push(r);
                    }
                }

                // Merge complaint_history
                const compIds = new Set((existingPatient.complaint_history || []).map(c => c._id?.toString?.() || ''));
                for (const c of (patient.complaint_history || [])) {
                    const cid = c._id?.toString?.() || '';
                    if (!cid || !compIds.has(cid)) {
                        compIds.add(cid);
                        if (!existingPatient.complaint_history) existingPatient.complaint_history = [];
                        existingPatient.complaint_history.push(c);
                    }
                }

                // Keep most recent patient info
                const existingDate = new Date(existingPatient.date || existingPatient.createdAt || 0);
                const newDate = new Date(patient.date || patient.createdAt || 0);
                if (newDate > existingDate) {
                    existingPatient.patient_name = patient.patient_name || existingPatient.patient_name;
                    existingPatient.age = patient.age || existingPatient.age;
                    existingPatient.address = patient.address || existingPatient.address;
                    existingPatient.fcmToken = patient.fcmToken || existingPatient.fcmToken;
                    existingPatient.token = patient.token || existingPatient.token;
                    existingPatient.status = patient.status || existingPatient.status;
                    existingPatient.date = patient.date || existingPatient.date;
                    existingPatient.time = patient.time || existingPatient.time;
                }
            } else {
                patient.visits = filteredVisits || [];
                patient.all_visits = [];
                patientsMap.set(mergeKey, patient);
            }
        });

        // Convert map back to array
        let mergedPatients = Array.from(patientsMap.values());

        // Re-sort merged patients based on sortBy parameter
        if (sortBy === 'date') {
            mergedPatients.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt || 0);
                const dateB = new Date(b.date || b.createdAt || 0);
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
        } else if (sortBy === 'name') {
            mergedPatients.sort((a, b) => {
                const nameA = (a.patient_name || '').toLowerCase();
                const nameB = (b.patient_name || '').toLowerCase();
                return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            });
        }

        // Now apply pagination to merged results
        let patients;
        let totalCount = mergedPatients.length;
        let paginationInfo = null;

        if (usePagination) {
            // Parse pagination parameters
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const skip = (pageNum - 1) * limitNum;

            // Apply pagination to merged patients
            patients = mergedPatients.slice(skip, skip + limitNum);

            // Calculate pagination metadata based on merged count
            const totalPages = Math.ceil(totalCount / limitNum);
            paginationInfo = {
                currentPage: pageNum,
                totalPages: totalPages,
                totalItems: totalCount,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
                nextPage: pageNum < totalPages ? pageNum + 1 : null,
                prevPage: pageNum > 1 ? pageNum - 1 : null
            };
        } else {
            // Return all merged patients
            patients = mergedPatients;
        }

        // Fetch external service request details for the current doctor
        const serviceRequests = await ExternalServiceRequest.aggregate([
            { $match: { doctor_id: doctor_id } },
            {
                $group: {
                    _id: '$patient_id',
                    count: { $sum: 1 },
                    services: {
                        $push: {
                            service_name: '$service_name',
                            provider_name: '$provider_name',
                            status: '$status',
                            requestedAt: '$requestedAt'
                        }
                    }
                }
            }
        ]);

        // Create a map for quick lookup
        const servicesMap = new Map();
        serviceRequests.forEach(item => {
            servicesMap.set(item._id, {
                count: item.count,
                services: item.services
            });
        });

        // Add service details and normalize time to 24h for correct dashboard AM/PM display
        const patientsWithCounts = patients.map(p => {
            const patientObj = normalizePatientTimeForResponse(p);
            const serviceData = servicesMap.get(patientObj.patient_id);
            return {
                ...patientObj,
                externalServiceRequestCount: serviceData?.count || 0,
                externalServiceRequests: serviceData?.services || []
            };
        });

        // Build response
        const response = {
            success: true,
            message: 'Patients retrieved successfully',
            data: patientsWithCounts,
            totalItems: totalCount
        };

        // Add pagination info if pagination was used
        if (paginationInfo) {
            response.pagination = paginationInfo;
        }

        // Add applied filters info
        response.filters = {
            doctor_id,
            search: search || null,
            startDate: startDate || null,
            endDate: endDate || null,
            status: status || null,
            sortBy,
            sortOrder
        };

        res.json(response);
    } catch (error) {
        console.error('Error retrieving patients:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patients',
            error: error.message
        });
    }
};

// Get all patients with optional filters: doctor_id, clinic_id, assistant_id
// Supports pagination and sorting like mobile API
// All filters are optional and can be used in any combination
// Example: GET /api/patients?doctor_id=123&clinic_id=456&page=1&limit=20&sortBy=created_at&sortOrder=desc
// Example: GET /api/patients?doctor_id=123
// Example: GET /api/patients?clinic_id=456&assistant_id=789
// Example: GET /api/patients (returns all patients)
const getAllPatients = async (req, res) => {
    try {
        const {
            doctor_id,
            clinic_id,
            assistant_id,
            startDate,
            endDate,
            page,
            limit,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search
        } = req.query;

        // CLINIC SCOPE: When enabled, query across all specified branch clinic_ids,
        // then merge results by normalized_phone (same patient seen as one entry with all visits).
        // This code path is NEVER triggered for existing single-doctor/single-clinic users.
        const { useClinicScope: allScope, clinicIds: allClinicIds } = parseClinicScope(req);
        if (allScope) {
            const scopeFilter = { clinic_id: { $in: allClinicIds } };
            if (doctor_id) {
                scopeFilter.doctor_id = doctor_id;
            }
            if (search) {
                scopeFilter.$or = [
                    { patient_name: { $regex: search, $options: 'i' } },
                    { patient_phone: { $regex: search, $options: 'i' } },
                    { file_number: { $regex: search, $options: 'i' } }
                ];
            }
            if (startDate || endDate) {
                scopeFilter.createdAt = {};
                if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); scopeFilter.createdAt.$gte = s; }
                if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); scopeFilter.createdAt.$lte = e; }
            }

            const sortObj = { createdAt: sortOrder === 'asc' ? 1 : -1 };
            const allScopePatients = await Patient.find(scopeFilter).sort(sortObj).lean();

            // Merge by file_number+phone (or phone+name for legacy records without file_number)
            const phoneMap = new Map();
            for (const p of allScopePatients) {
                const po = toPlainPatientDoc(p);
                let key;
                if (po.file_number) {
                    const normPhone = po.normalized_phone || normalizePhone(po.patient_phone) || po.patient_phone;
                    key = `${po.file_number}::${normPhone}`;
                } else {
                    const normPhone = po.normalized_phone || normalizePhone(po.patient_phone) || po.patient_phone;
                    const normName = po.normalized_name || normalizeName(po.patient_name) || '';
                    key = normPhone ? `${normPhone}::${normName}` : (po._id?.toString() || String(Math.random()));
                }
                // Combine visits + all_visits and dedup
                const allVisitsArr = [...(po.all_visits || []), ...(po.visits || [])];
                const dedupedVisits = [];
                const vSeen = new Set();
                for (const v of allVisitsArr) {
                    const vid = v.visit_id || v._id?.toString() || '';
                    if (!vid || !vSeen.has(vid)) { vSeen.add(vid); dedupedVisits.push(v); }
                }
                po.visits = dedupedVisits;
                po.all_visits = [];

                if (!phoneMap.has(key)) {
                    phoneMap.set(key, po);
                } else {
                    const existing = phoneMap.get(key);
                    const visitSeen = new Set((existing.visits || []).map(v => v.visit_id || v._id?.toString()));
                    for (const v of po.visits) {
                        const vid = v.visit_id || v._id?.toString() || '';
                        if (!vid || !visitSeen.has(vid)) { visitSeen.add(vid); existing.visits.push(v); }
                    }
                    existing.visits.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                    if (new Date(po.createdAt || 0) > new Date(existing.createdAt || 0)) {
                        existing.patient_name = po.patient_name || existing.patient_name;
                        existing.age = po.age || existing.age;
                        existing.address = po.address || existing.address;
                    }
                    if (!existing.file_number && po.file_number) existing.file_number = po.file_number;
                }
            }

            let mergedList = Array.from(phoneMap.values());
            // Sort merged list by latest visit or createdAt
            mergedList.sort((a, b) => {
                const latestA = a.visits && a.visits.length > 0 ? new Date(a.visits[0].date || 0) : new Date(a.createdAt || 0);
                const latestB = b.visits && b.visits.length > 0 ? new Date(b.visits[0].date || 0) : new Date(b.createdAt || 0);
                return sortOrder === 'asc' ? latestA - latestB : latestB - latestA;
            });

            const totalCount = mergedList.length;
            let paginationInfo = null;
            if (page !== undefined || limit !== undefined) {
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 20;
                const skip = (pageNum - 1) * limitNum;
                const totalPages = Math.ceil(totalCount / limitNum);
                paginationInfo = {
                    currentPage: pageNum, totalPages, totalItems: totalCount,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages, hasPrevPage: pageNum > 1,
                    nextPage: pageNum < totalPages ? pageNum + 1 : null,
                    prevPage: pageNum > 1 ? pageNum - 1 : null
                };
                mergedList = mergedList.slice(skip, skip + limitNum);
            }

            return res.status(200).json({
                success: true,
                message: 'Patients retrieved successfully (clinic scope)',
                data: mergedList.map(normalizePatientTimeForResponse),
                totalItems: totalCount,
                pagination: paginationInfo,
                filters: { clinic_ids: allClinicIds, search: search || null, startDate: startDate || null, endDate: endDate || null }
            });
        }

        // EXISTING PATH: single doctor/clinic filter — unchanged for all current users
        // Build filter object - only include filters that are provided (strict matching)
        const filter = {};

        if (doctor_id) {
            filter.doctor_id = doctor_id;
        }

        // Strict filtering - only match exact clinic_id (no empty values)
        if (clinic_id) {
            filter.clinic_id = clinic_id;
        }

        // Strict filtering - only match exact assistant_id (no empty values)
        if (assistant_id) {
            filter.assistant_id = assistant_id;
        }

        // Search by name, phone, or file number
        if (search) {
            filter.$or = [
                { patient_name: { $regex: search, $options: 'i' } },
                { patient_phone: { $regex: search, $options: 'i' } },
                { file_number: { $regex: search, $options: 'i' } }
            ];
        }

        // Add date filtering - filter by createdAt (Date field) for reliable date comparison
        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                filter.createdAt.$gte = start;
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        // Build sort object based on sortBy parameter
        // Match mobile API behavior: use createdAt/updatedAt (Date fields) for proper sorting
        // The 'date' field is a string and doesn't sort correctly, so use createdAt instead
        const sortObject = {};
        console.log('Sort parameters:', { sortBy, sortOrder });
        if (sortBy === 'created_at' || sortBy === 'createdAt' || sortBy === 'date') {
            // For 'date' sortBy, use createdAt (Date field) instead of date string field
            // This matches mobile API behavior and ensures proper chronological sorting
            sortObject.createdAt = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'updated_at' || sortBy === 'updatedAt') {
            sortObject.updatedAt = sortOrder === 'asc' ? 1 : -1;
        } else {
            // Default to createdAt descending (newest first) - matches mobile API
            sortObject.createdAt = -1;
        }
        console.log('Sort object:', sortObject);
        console.log('Filter object:', filter);

        // Fetch all matching patients first, then merge duplicates by file_number,
        // then apply pagination — same approach as getPatientsByDoctor.
        const allRawPatients = await Patient.find(filter).sort(sortObject).lean();

        // Merge patients that share the same file_number (same person, multiple docs)
        const mergeMap = new Map();
        for (const rawP of allRawPatients) {
            const p = toPlainPatientDoc(rawP);

            let mergeKey;
            if (p.file_number) {
                const normPhone = p.normalized_phone || normalizePhone(p.patient_phone) || p.patient_phone;
                mergeKey = `${p.file_number}::${normPhone}`;
            } else {
                const normName = p.normalized_name || normalizeName(p.patient_name) || '';
                mergeKey = `${p.patient_phone}::${normName}`;
            }

            // Combine visits + all_visits, dedup
            const vSeen = new Set();
            const combined = [];
            for (const v of [...(p.all_visits || []), ...(p.visits || [])]) {
                const vid = v.visit_id || v._id?.toString?.() || '';
                if (!vid || !vSeen.has(vid)) { if (vid) vSeen.add(vid); combined.push(v); }
            }
            p.visits = combined;
            p.all_visits = [];

            if (mergeMap.has(mergeKey)) {
                const existing = mergeMap.get(mergeKey);
                // Merge visits
                const eIds = new Set(existing.visits.map(v => v.visit_id || v._id?.toString?.() || ''));
                for (const v of p.visits) {
                    const vid = v.visit_id || v._id?.toString?.() || '';
                    if (!vid || !eIds.has(vid)) { eIds.add(vid); existing.visits.push(v); }
                }
                existing.visits.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                // Merge reports
                const rIds = new Set((existing.reports || []).map(r => r.report_id || r._id?.toString?.() || ''));
                for (const r of (p.reports || [])) {
                    const rid = r.report_id || r._id?.toString?.() || '';
                    if (!rid || !rIds.has(rid)) { rIds.add(rid); if (!existing.reports) existing.reports = []; existing.reports.push(r); }
                }
                // Merge complaint_history
                const cIds = new Set((existing.complaint_history || []).map(c => c._id?.toString?.() || ''));
                for (const c of (p.complaint_history || [])) {
                    const cid = c._id?.toString?.() || '';
                    if (!cid || !cIds.has(cid)) { cIds.add(cid); if (!existing.complaint_history) existing.complaint_history = []; existing.complaint_history.push(c); }
                }
                // Keep most recent info
                if (new Date(p.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
                    existing.patient_name = p.patient_name || existing.patient_name;
                    existing.age = p.age || existing.age;
                    existing.address = p.address || existing.address;
                    existing.date = p.date || existing.date;
                    existing.time = p.time || existing.time;
                    existing.status = p.status || existing.status;
                }
            } else {
                mergeMap.set(mergeKey, p);
            }
        }

        let mergedPatients = Array.from(mergeMap.values());
        let totalCount = mergedPatients.length;
        let paginationInfo = null;

        if (page !== undefined || limit !== undefined) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const skip = (pageNum - 1) * limitNum;
            const totalPages = Math.ceil(totalCount / limitNum);
            paginationInfo = {
                currentPage: pageNum,
                totalPages: totalPages,
                totalItems: totalCount,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
                nextPage: pageNum < totalPages ? pageNum + 1 : null,
                prevPage: pageNum > 1 ? pageNum - 1 : null
            };
            mergedPatients = mergedPatients.slice(skip, skip + limitNum);
        }

        const patients = mergedPatients;

        // Fetch external service request counts for patients
        // Only if doctor_id is specified (for performance)
        let patientsWithCounts = patients;
        if (doctor_id) {
            const serviceRequests = await ExternalServiceRequest.aggregate([
                { $match: { doctor_id: doctor_id } },
                {
                    $group: {
                        _id: '$patient_id',
                        count: { $sum: 1 },
                        services: {
                            $push: {
                                service_name: '$service_name',
                                provider_name: '$provider_name',
                                status: '$status',
                                requestedAt: '$requestedAt'
                            }
                        }
                    }
                }
            ]);

            // Create a map for quick lookup
            const servicesMap = new Map();
            serviceRequests.forEach(item => {
                servicesMap.set(item._id, {
                    count: item.count,
                    services: item.services
                });
            });

            // Add service details and normalize time to 24h for correct dashboard AM/PM display
            patientsWithCounts = patients.map(p => {
                const patientObj = normalizePatientTimeForResponse(p);
                const serviceData = servicesMap.get(patientObj.patient_id);
                return {
                    ...patientObj,
                    externalServiceRequestCount: serviceData?.count || 0,
                    externalServiceRequests: serviceData?.services || []
                };
            });
        } else {
            patientsWithCounts = patients.map(normalizePatientTimeForResponse);
        }

        res.status(200).json({
            success: true,
            message: 'Patients retrieved successfully',
            data: patientsWithCounts,
            totalItems: totalCount,
            pagination: paginationInfo,
            filters: {
                doctor_id: doctor_id || null,
                clinic_id: clinic_id || null,
                assistant_id: assistant_id || null,
                startDate: startDate || null,
                endDate: endDate || null,
                sortBy: sortBy || 'createdAt',
                sortOrder: sortOrder || 'desc'
            }
        });
    } catch (error) {
        console.error('Error retrieving patients:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving patients',
            error: error.message
        });
    }
};

// Update patient receipt - now updates the most recent visit's receipts
// In your updatePatient controller
// Update the updatePatient function in patientController.js
const updatePatient = async (req, res) => {
    try {
        const patientId = req.params.id;
        const { doctor_id } = req.query;
        const {
            drugModel,
            drugs,
            notes,
            visit_id,
            complaint,
            diagnosis
        } = req.body;

        // Find the patient
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Check authorization
        if (doctor_id && patient.doctor_id !== doctor_id) {
            return res.status(403).json({ message: 'Not authorized to update this patient' });
        }

        // Prepare the receipt
        const newReceipt = {
            drugs: drugs || [],
            notes: notes || "",
            drugModel: drugModel || "new",
            date: new Date()
        };

        let visitIndex = -1;

        // Find which visit to update - with improved visit finding logic
        if (visit_id && patient.visits.length > 0) {
            visitIndex = patient.visits.findIndex(v => v.visit_id === visit_id);

            if (visitIndex === -1) {
                // If visit not found by ID but was provided, return error
                return res.status(404).json({ message: 'Visit not found' });
            }
        } else if (patient.visits.length > 0) {
            // Use the most recent visit - ONLY if no visit_id was provided
            visitIndex = patient.visits.length - 1;
        } else {
            // Create a new visit ONLY if none exists
            const newVisit = {
                visit_id: uuidv4(),
                date: new Date(),
                time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                visit_type: "كشف",
                complaint: complaint || "",
                diagnosis: diagnosis || "",
                receipts: [newReceipt]
            };
            patient.visits.push(newVisit);
            visitIndex = 0;
        }

        // Update the visit with the new receipt and complaint/diagnosis if provided
        if (visitIndex >= 0) {
            // Always push the receipt, even if drugs array is empty (for inventory-only receipts)
            patient.visits[visitIndex].receipts.push(newReceipt);

            // Update receipt string for backward compatibility only if drugs exist
            if (drugs && drugs.length > 0) {
                const receiptString = drugs.map(drug =>
                    `الدواء: ${drug.drug} | التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}`
                ).join(' || ');
                patient.receipt = receiptString;
            } else {
                // If no drugs, set receipt to indicate inventory-only or notes-only
                patient.receipt = notes || "روشتة بدون أدوية";
            }

            // Update complaint and diagnosis if provided
            if (complaint !== undefined) {
                patient.visits[visitIndex].complaint = complaint;
            }

            if (diagnosis !== undefined) {
                patient.visits[visitIndex].diagnosis = diagnosis;
            }
        }

        await patient.save();

        res.status(200).json({
            message: 'Patient updated successfully',
            patient: patient
        });
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({
            message: 'Error updating patient',
            error: error.message
        });
    }
};

// Get a specific patient by ID or phone
const getPatientByIdOrPhone = async (req, res) => {
    try {
        const { identifier, doctor_id } = req.params;

        // Validate doctor_id
        if (!doctor_id) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // CLINIC SCOPE: When enabled, find the patient across all branch clinic_ids and merge docs.
        const { useClinicScope: lookupScope, clinicIds: lookupClinicIds } = parseClinicScope(req);
        if (lookupScope) {
            const normalizedId = normalizePhone(identifier);
            const orConditions = [{ patient_phone: identifier }, { patient_id: identifier }];
            if (normalizedId) orConditions.push({ normalized_phone: normalizedId });
            const clinicPatients = await Patient.find({
                clinic_id: { $in: lookupClinicIds },
                $or: orConditions
            });
            if (!clinicPatients || clinicPatients.length === 0) {
                return res.status(404).json({ message: 'Patient not found' });
            }
            const merged = mergePatientsToOne(clinicPatients);
            return res.status(200).json({ message: 'Patient found', patient: merged });
        }

        // EXISTING PATH: single doctor lookup
        // Try exact patient_id first, then fall back to phone (preferring most recent)
        let patient = await Patient.findOne({ doctor_id, patient_id: identifier });
        if (!patient) {
            const norm = normalizePhone(identifier);
            const phoneConditions = [{ patient_phone: identifier }];
            if (norm) phoneConditions.push({ normalized_phone: norm });
            patient = await Patient.findOne({
                doctor_id,
                $or: phoneConditions
            }).sort({ updatedAt: -1 });
        }

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        res.status(200).json({
            message: 'Patient found',
            patient
        });
    } catch (error) {
        console.error('Error retrieving patient:', error);
        res.status(500).json({
            message: 'Error retrieving patient',
            error: error.message
        });
    }
};

/**
 * Update patient visit type and urgency
 * Automatically updates billing if applicable
 */
const updatePatientVisitType = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const { visit_type, visit_urgency, doctor_id, changed_by, reason } = req.body;

        if (!patient_id || !visit_type || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID, Visit Type, and Doctor ID are required'
            });
        }

        // 1. Get patient current data (may be null for waiting-list patients not yet synced to MongoDB)
        const patient = await Patient.findOne({ patient_id });

        // 2. Determine new price
        // Priority 1: Doctor Settings (Simple mode - used by Dashboard)
        // Priority 2: Visit Type Configuration (Advanced mode)
        // Priority 3: Defaults

        const doctor = await Doctor.findOne({ doctor_id });
        const config = await VisitTypeConfiguration.findOne({ doctor_id });

        let newPrice = 0;
        let visitTypeName = visit_type;
        let priceFound = false;

        // Default prices if no configuration found
        const DEFAULT_PRICES = {
            'visit': { normal: 500, urgent: 700 },
            'revisit': { normal: 200, urgent: 300 },
            'consultation': { normal: 150, urgent: 250 },
            'other': { normal: 0, urgent: 0 }
        };

        // Check Doctor Settings first (This is what Dashboard Settings saves to)
        if (doctor && doctor.settings) {
            const normalizedType = visit_type.toLowerCase().trim();

            // Map types to settings fields
            if (['visit', 'كشف', 'examination', 'kashf'].includes(normalizedType)) {
                newPrice = doctor.settings.consultationFee || 0;
                visitTypeName = 'Visit'; // Standardize name
                priceFound = true;
            } else if (['revisit', 're-visit', 'اعاده كشف', 'إعادة كشف', 'revisit fee', 'eada'].includes(normalizedType)) {
                newPrice = doctor.settings.revisitFee || 0;
                visitTypeName = 'Re-visit';
                priceFound = true;
            } else if (['consultation', 'estishara', 'استشارة', 'استشاره'].includes(normalizedType)) {
                newPrice = doctor.settings.estisharaFee || 0;
                visitTypeName = 'Consultation';
                priceFound = true;
            }
        }

        // If not found in simple settings, check Advanced Configuration
        if (!priceFound && config) {
            const typeConfig = config.visit_types.find(vt => vt.type_id === visit_type || vt.name === visit_type || vt.name_ar === visit_type);
            if (typeConfig) {
                newPrice = visit_urgency === 'urgent' ? typeConfig.urgent_price : typeConfig.normal_price;
                visitTypeName = typeConfig.name; // Use English name for consistency
                priceFound = true;
            }
        }

        // If still not found, use Defaults
        if (!priceFound) {
            const defaults = DEFAULT_PRICES[visit_type.toLowerCase()] || DEFAULT_PRICES['other'];
            newPrice = visit_urgency === 'urgent' ? defaults.urgent : defaults.normal;
        }

        // 3. Update billing if it exists and is not fully paid (or even if paid, to adjust)
        // Find the most recent billing for this patient
        const billing = await Billing.findOne({
            patient_id,
            doctor_id,
            // Exclude service-only bills to ensure we update the consultation bill
            consultationType: { $nin: ['خدمات إضافية', 'Additional Services', 'services'] }
        }).sort({ createdAt: -1 });

        let oldPrice = 0;

        if (billing) {
            oldPrice = billing.consultationFee;

            // Only update if price is different or type changed
            if (oldPrice !== newPrice || billing.consultationType !== visitTypeName) {
                // Calculate new total
                // We need to keep other services intact
                const servicesTotal = billing.servicesTotal || 0;
                let discountAmount = 0;

                // Recalculate discount if it exists
                if (billing.discount && billing.discount.value > 0) {
                    if (billing.discount.type === 'percentage') {
                        discountAmount = ((servicesTotal + newPrice) * billing.discount.value) / 100;
                    } else {
                        discountAmount = billing.discount.value;
                    }
                }

                const newTotalAmount = Math.max(0, (servicesTotal + newPrice) - discountAmount);

                // Update billing
                billing.consultationFee = newPrice;
                billing.totalAmount = newTotalAmount;
                billing.consultationType = visitTypeName || visit_type;

                // If paid amount equals old total, update paid amount to new total? 
                // Only if it was fully paid before.
                // But safer to leave assessment to the user or mark as pending if price increased.
                if (billing.paymentStatus === 'paid' && newTotalAmount > billing.amountPaid) {
                    billing.paymentStatus = 'partial';
                }

                billing.updatedAt = Date.now();
                await billing.save();
            }
        }

        // 4 & 5. Update patient record if it exists in MongoDB (not yet synced for waiting-list patients)
        if (patient) {
            if (!patient.visit_type_change_history) {
                patient.visit_type_change_history = [];
            }

            patient.visit_type_change_history.push({
                from_type: patient.visit_type,
                to_type: visit_type,
                from_urgency: patient.visit_urgency || 'normal',
                to_urgency: visit_urgency || 'normal',
                old_price: oldPrice,
                new_price: newPrice,
                changed_by: changed_by || 'doctor',
                changed_at: new Date(),
                reason: reason || 'Updated from dashboard'
            });

            patient.visit_type = visit_type;
            patient.visit_urgency = visit_urgency || 'normal';
            patient.visit_type_changed = true;

            if (patient.visits && patient.visits.length > 0) {
                patient.visits.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                patient.visits[0].visit_type = visit_type;
            }

            await patient.save();
        }

        res.status(200).json({
            success: true,
            message: 'Visit type updated successfully',
            data: {
                patient: patient || null,
                newPrice,
                oldPrice,
                priceDifference: newPrice - oldPrice,
                billingUpdated: !!billing
            }
        });

    } catch (error) {
        console.error('Error updating visit type:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating visit type',
            error: error.message
        });
    }
};

/**
 * GET /api/patients/file-number?phone=&doctor_id=
 * Returns the existing file_number for a patient (by phone + doctor),
 * or generates and returns a new unique one — without creating any record.
 */
const getOrGenerateFileNumber = async (req, res) => {
    try {
        const { phone, doctor_id, patient_name } = req.query;
        if (!phone || !doctor_id) {
            return res.status(400).json({ message: 'phone and doctor_id are required' });
        }

        const norm = normalizePhone(phone);
        const normalizedPatientName = normalizeName(patient_name);

        // Helper: pick the best matching patient from a list by name similarity (≥95%)
        const findByName = (list) => {
            if (!normalizedPatientName) return list[0] || null;
            return list.find((p) => {
                const storedName = p.normalized_name || normalizeName(p.patient_name);
                return nameSimilarity(normalizedPatientName, storedName) >= 0.95;
            }) || null;
        };

        // CLINIC SCOPE: When enabled, search across all branch clinic_ids for an existing file_number.
        // This allows all branches of a center to share the same file number per patient.
        const { useClinicScope: fnScope, clinicIds: fnClinicIds } = parseClinicScope(req);
        if (fnScope) {
            const scopeCandidates = norm
                ? await Patient.find({ clinic_id: { $in: fnClinicIds }, normalized_phone: norm }).lean()
                : [];
            let scopeExisting = findByName(scopeCandidates);
            if (!scopeExisting) {
                const fallback = await Patient.find({ clinic_id: { $in: fnClinicIds }, patient_phone: phone }).lean();
                scopeExisting = findByName(fallback);
            }
            if (scopeExisting && scopeExisting.file_number) {
                return res.json({ file_number: scopeExisting.file_number, existing: true });
            }
            const file_number = await generateFileNumber();
            return res.json({ file_number, existing: false });
        }

        // EXISTING PATH: single doctor lookup with optional name filtering
        const candidates = norm
            ? await Patient.find({ doctor_id, normalized_phone: norm }).lean()
            : [];
        let existing = findByName(candidates);
        if (!existing) {
            const fallback = await Patient.find({ patient_phone: phone, doctor_id }).lean();
            existing = findByName(fallback);
        }
        if (existing && existing.file_number) {
            return res.json({ file_number: existing.file_number, existing: true });
        }

        // Otherwise generate a fresh unique file_number (does not save anything)
        const file_number = await generateFileNumber();
        return res.json({ file_number, existing: false });
    } catch (error) {
        console.error('Error generating file number:', error);
        res.status(500).json({ message: 'Error generating file number', error: error.message });
    }
};

/**
 * GET /api/patients/by-phone?phone=&doctor_id=
 * Returns all patients for this doctor matching the given phone number.
 * Used by the assistant portal to detect same-phone family members.
 */
const getPatientsByPhone = async (req, res) => {
    try {
        const { phone, doctor_id } = req.query;
        if (!phone || !doctor_id) {
            return res.status(400).json({ message: 'phone and doctor_id are required' });
        }
        const norm = normalizePhone(phone);
        const orConditions = [{ patient_phone: phone }];
        if (norm) orConditions.push({ normalized_phone: norm });
        const raw = await Patient.find({ doctor_id, $or: orConditions })
            .select('patient_name file_number patient_id')
            .lean();
        const seen = new Set();
        const patients = [];
        for (const p of raw) {
            const key = p.patient_id || p._id?.toString();
            if (!seen.has(key)) {
                seen.add(key);
                patients.push(p);
            }
        }
        return res.json({ patients });
    } catch (error) {
        console.error('Error fetching patients by phone:', error);
        res.status(500).json({ message: 'Error fetching patients by phone', error: error.message });
    }
};

module.exports = {
    savePatient,
    getAllPatients,
    getPatientsByDoctor,
    updatePatient,
    getPatientByIdOrPhone,
    updatePatientVisitType,
    getOrGenerateFileNumber,
    getPatientsByPhone
};