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
            assistant_id = ""
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

        // Check if patient with same phone number and doctor_id already exists
        let existingPatient = await Patient.findOne({
            patient_phone,
            doctor_id
        });

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

            await existingPatient.save();

            // Auto-record consultation fee if doctor has set fees
            try {
                const doctor = await Doctor.findOne({ doctor_id });
                if (doctor && doctor.settings) {
                    const isRevisit = (visit_type === 'اعاده كشف' || visit_type === 'إعادة كشف');
                    const consultationFee = isRevisit
                        ? (doctor.settings.revisitFee || 0)
                        : (doctor.settings.consultationFee || 0);

                    if (consultationFee > 0) {
                        const billing = new Billing({
                            billing_id: uuidv4(),
                            doctor_id,
                            patient_id: existingPatient.patient_id,
                            patient_name: existingPatient.patient_name,
                            patient_phone: existingPatient.patient_phone || "",
                            visit_id: visit_id,
                            clinic_id: clinic_id || "",
                            consultationFee: consultationFee,
                            consultationType: isRevisit ? "اعاده كشف" : "كشف",
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
                        console.log(`Consultation fee ${consultationFee} EGP recorded for ${existingPatient.patient_name}`);
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

        // If patient doesn't exist, create a new patient
        const newFileNumber = await generateFileNumber();
        const newPatient = new Patient({
            patient_name,
            patient_phone,
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
            if (doctor && doctor.settings) {
                const isRevisit = (visit_type === 'اعاده كشف' || visit_type === 'إعادة كشف');
                const consultationFee = isRevisit
                    ? (doctor.settings.revisitFee || 0)
                    : (doctor.settings.consultationFee || 0);

                if (consultationFee > 0) {
                    const billing = new Billing({
                        billing_id: uuidv4(),
                        doctor_id,
                        patient_id: newPatient.patient_id,
                        patient_name: newPatient.patient_name,
                        patient_phone: newPatient.patient_phone || "",
                        visit_id: newPatient.visits[0]?.visit_id || "",
                        clinic_id: clinic_id || "",
                        consultationFee: consultationFee,
                        consultationType: isRevisit ? "اعاده كشف" : "كشف",
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
                    console.log(`Consultation fee ${consultationFee} EGP recorded for new patient ${newPatient.patient_name}`);
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
        // Fetch all matching patients first
        let allPatients = await Patient.find(queryFilter).sort(sortObject);

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

        // Group patients by phone number and merge visits
        // This ensures patients with same phone number are treated as one user
        const patientsMap = new Map();

        allPatients.forEach(patient => {
            const phoneKey = patient.patient_phone;

            // Filter visits based on date range
            const filteredVisits = filterVisitsByDate(patient.visits || []);

            if (patientsMap.has(phoneKey)) {
                // Merge with existing patient record
                const existingPatient = patientsMap.get(phoneKey);

                // Ensure existingPatient.visits is an array
                if (!existingPatient.visits || !Array.isArray(existingPatient.visits)) {
                    existingPatient.visits = [];
                }

                // Merge visits - combine all visits from both records (already filtered)
                const existingFilteredVisits = filterVisitsByDate(existingPatient.visits || []);
                const allVisits = [...(existingFilteredVisits || []), ...(filteredVisits || [])];

                // Sort visits by date (newest first)
                allVisits.sort((a, b) => {
                    const dateA = new Date(a.date || a.time || 0);
                    const dateB = new Date(b.date || b.time || 0);
                    return dateB - dateA;
                });

                // Update existing patient with merged data
                // Keep the most recent patient info (name, age, address, etc.)
                const existingDate = new Date(existingPatient.date || existingPatient.createdAt || 0);
                const newDate = new Date(patient.date || patient.createdAt || 0);

                if (newDate > existingDate) {
                    // Newer patient record - update info but keep merged visits
                    existingPatient.patient_name = patient.patient_name || existingPatient.patient_name;
                    existingPatient.age = patient.age || existingPatient.age;
                    existingPatient.address = patient.address || existingPatient.address;
                    existingPatient.fcmToken = patient.fcmToken || existingPatient.fcmToken;
                    existingPatient.token = patient.token || existingPatient.token;
                    existingPatient.status = patient.status || existingPatient.status;
                    existingPatient.date = patient.date || existingPatient.date;
                    existingPatient.time = patient.time || existingPatient.time;
                }

                // Update visits with merged list
                existingPatient.visits = allVisits;
            } else {
                // First occurrence of this phone number
                // Convert Mongoose document to plain object if needed
                let patientObj;
                if (patient.toObject && typeof patient.toObject === 'function') {
                    patientObj = patient.toObject();
                } else {
                    patientObj = JSON.parse(JSON.stringify(patient));
                }
                // Ensure visits array is always present, even if empty
                patientObj.visits = filteredVisits || [];
                patientsMap.set(phoneKey, patientObj);
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

        // Handle pagination
        let patients;
        let totalCount;
        let paginationInfo = null;

        if (page !== undefined || limit !== undefined) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const skip = (pageNum - 1) * limitNum;

            // Get total count for pagination
            totalCount = await Patient.countDocuments(filter);

            // Fetch paginated results
            patients = await Patient.find(filter)
                .sort(sortObject)
                .skip(skip)
                .limit(limitNum);

            // Build pagination info
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
            // No pagination - return all matching records
            patients = await Patient.find(filter).sort(sortObject);
            totalCount = patients.length;
        }

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

        // Check if the identifier is a phone number or patient ID
        const patient = await Patient.findOne({
            $and: [
                { doctor_id },
                { $or: [{ patient_phone: identifier }, { patient_id: identifier }] }
            ]
        });

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

        // 1. Get patient current data
        const patient = await Patient.findOne({ patient_id });
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

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

        // 4. Save change history
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

        // 5. Update patient record
        patient.visit_type = visit_type; // Keep original ID/Value as requested
        patient.visit_urgency = visit_urgency || 'normal';
        patient.visit_type_changed = true;

        // NEW: Sync the visit_type to the latest visit in the history array
        if (patient.visits && patient.visits.length > 0) {
            // Sort by date descending to find the latest visit
            patient.visits.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            // Update the latest visit
            patient.visits[0].visit_type = visit_type;
        }

        await patient.save();

        res.status(200).json({
            success: true,
            message: 'Visit type updated successfully',
            data: {
                patient,
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

module.exports = {
    savePatient,
    getAllPatients,
    getPatientsByDoctor,
    updatePatient,
    getPatientByIdOrPhone,
    updatePatientVisitType
};