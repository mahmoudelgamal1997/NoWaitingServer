const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const { v4: uuidv4 } = require('uuid');

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
            diagnosis = ""  // Added for initial visit
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
            // Update doctor_name if we resolved it or if it was provided
            if (resolvedDoctorName) {
                existingPatient.doctor_name = resolvedDoctorName;
            }

            await existingPatient.save();

            return res.status(200).json({
                message: 'New visit added for existing patient',
                patient: existingPatient,
                visit: newVisit
            });
        }

        // If patient doesn't exist, create a new patient
        const newPatient = new Patient({
            patient_name,
            patient_phone,
            patient_id: patient_id || uuidv4(), // Generate patient_id if not provided
            doctor_id,
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

        // Add date range filter if provided
        // Note: date is stored as string in format YYYY-MM-DD
        if (startDate || endDate) {
            queryFilter.date = {};
            if (startDate) {
                // Format startDate to YYYY-MM-DD if needed
                const startDateStr = startDate.split('T')[0]; // Remove time if present
                queryFilter.date.$gte = startDateStr;
            }
            if (endDate) {
                // Format endDate to YYYY-MM-DD if needed
                const endDateStr = endDate.split('T')[0]; // Remove time if present
                queryFilter.date.$lte = endDateStr;
            }
        }

        // Build search filter for patient name or phone
        if (search) {
            queryFilter.$or = [
                { patient_name: { $regex: search, $options: 'i' } },
                { patient_phone: { $regex: search, $options: 'i' } }
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
        
        // Get today's date for filtering future visits
        // Always use actual today, not the endDate parameter (which might be in the future)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        console.log('Filtering future visits - today is:', todayStr);
        
        // Helper function to filter out future visits
        const filterFutureVisits = (visits) => {
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
                    
                    // Only include visits up to today (exclude future dates)
                    const isFuture = visitDateStr > todayStr;
                    if (isFuture) {
                        console.log('Filtering out future visit:', visitDateStr, 'Today:', todayStr);
                    }
                    return !isFuture; // Return false for future dates (filter them out)
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
            
            // Filter future visits from this patient
            const filteredVisits = filterFutureVisits(patient.visits);
            
            if (patientsMap.has(phoneKey)) {
                // Merge with existing patient record
                const existingPatient = patientsMap.get(phoneKey);
                
                // Ensure existingPatient.visits is an array
                if (!existingPatient.visits || !Array.isArray(existingPatient.visits)) {
                    existingPatient.visits = [];
                }
                
                // Merge visits - combine all visits from both records (already filtered)
                const existingFilteredVisits = filterFutureVisits(existingPatient.visits);
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
                // Filter future visits before adding
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

        // Build response
        const response = {
            success: true,
            message: 'Patients retrieved successfully',
            data: patients,
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

// Get all patients (admin only route)
const getAllPatients = async (req, res) => {
    try {
        // This could be protected with admin middleware
        const patients = await Patient.find();
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving patients', error: error.message });
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
            // Only push new receipt if there are drugs to add
            if (drugs && drugs.length > 0) {
                patient.visits[visitIndex].receipts.push(newReceipt);
            
                // Update receipt string for backward compatibility
                const receiptString = drugs.map(drug =>
                    `الدواء: ${drug.drug} | التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}`
                ).join(' || ');
                patient.receipt = receiptString;
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

module.exports = { 
    savePatient, 
    getAllPatients, 
    getPatientsByDoctor, 
    updatePatient,
    getPatientByIdOrPhone
};