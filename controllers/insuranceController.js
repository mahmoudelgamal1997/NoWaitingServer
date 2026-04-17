const InsuranceCompany = require('../models/InsuranceCompany');
const Patient = require('../models/patient');
const PatientPackage = require('../models/patientPackage');
const { v4: uuidv4 } = require('uuid');

// ─── Company CRUD ─────────────────────────────────────────────────────────────

const createCompany = async (req, res) => {
    try {
        const { doctor_id, name_ar, name_en, coverage_percentage, notes } = req.body;

        if (!doctor_id || !name_ar) {
            return res.status(400).json({ success: false, message: 'doctor_id and name_ar are required' });
        }

        const company = new InsuranceCompany({
            company_id: uuidv4(),
            doctor_id,
            name_ar,
            name_en: name_en || '',
            coverage_percentage: coverage_percentage ?? 0,
            notes: notes || ''
        });

        await company.save();

        res.status(201).json({ success: true, message: 'Insurance company created', data: company });
    } catch (error) {
        console.error('Error creating insurance company:', error);
        res.status(500).json({ success: false, message: 'Error creating insurance company', error: error.message });
    }
};

const getCompanies = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { includeInactive } = req.query;

        if (!doctor_id) {
            return res.status(400).json({ success: false, message: 'doctor_id is required' });
        }

        const query = { doctor_id };
        if (!includeInactive || includeInactive === 'false') {
            query.isActive = true;
        }

        const companies = await InsuranceCompany.find(query).sort({ name_ar: 1 });

        res.status(200).json({ success: true, data: companies, count: companies.length });
    } catch (error) {
        console.error('Error fetching insurance companies:', error);
        res.status(500).json({ success: false, message: 'Error fetching insurance companies', error: error.message });
    }
};

const updateCompany = async (req, res) => {
    try {
        const { doctor_id, company_id } = req.params;
        const { name_ar, name_en, coverage_percentage, notes, isActive } = req.body;

        const company = await InsuranceCompany.findOne({ doctor_id, company_id });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Insurance company not found' });
        }

        if (name_ar !== undefined) company.name_ar = name_ar;
        if (name_en !== undefined) company.name_en = name_en;
        if (coverage_percentage !== undefined) company.coverage_percentage = coverage_percentage;
        if (notes !== undefined) company.notes = notes;
        if (isActive !== undefined) company.isActive = isActive;

        await company.save();

        res.status(200).json({ success: true, message: 'Insurance company updated', data: company });
    } catch (error) {
        console.error('Error updating insurance company:', error);
        res.status(500).json({ success: false, message: 'Error updating insurance company', error: error.message });
    }
};

const deleteCompany = async (req, res) => {
    try {
        const { doctor_id, company_id } = req.params;
        const { permanent } = req.query;

        const company = await InsuranceCompany.findOne({ doctor_id, company_id });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Insurance company not found' });
        }

        if (permanent === 'true') {
            await InsuranceCompany.deleteOne({ doctor_id, company_id });
            return res.status(200).json({ success: true, message: 'Insurance company permanently deleted' });
        }

        company.isActive = false;
        await company.save();
        res.status(200).json({ success: true, message: 'Insurance company deactivated', data: company });
    } catch (error) {
        console.error('Error deleting insurance company:', error);
        res.status(500).json({ success: false, message: 'Error deleting insurance company', error: error.message });
    }
};

// ─── Reports & Analytics ─────────────────────────────────────────────────────

const getMonthlyReport = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { month, year, company_id, date_from, date_to } = req.query;

        if (!doctor_id) {
            return res.status(400).json({ success: false, message: 'doctor_id is required' });
        }

        const query = { doctor_id, payment_type: 'insurance' };

        if (date_from || date_to) {
            // Date-range mode: date_from and date_to are "YYYY-MM-DD" strings
            // Build a regex that covers all dates in the range by collecting each
            // date string between from and to (works for ranges up to ~400 days)
            const from = date_from ? new Date(date_from + 'T00:00:00') : null;
            const to   = date_to   ? new Date(date_to   + 'T23:59:59') : null;

            // Use $in with all possible date strings (padded and unpadded) in the range
            const dateStrings = [];
            if (from && to) {
                const cur = new Date(from);
                while (cur <= to) {
                    const y = cur.getFullYear();
                    const m = cur.getMonth() + 1;
                    const d = cur.getDate();
                    dateStrings.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
                    dateStrings.push(`${y}-${m}-${d}`);
                    cur.setDate(cur.getDate() + 1);
                }
                query.date = { $in: dateStrings };
            } else if (from) {
                const y = from.getFullYear(), m = from.getMonth() + 1, d = from.getDate();
                query.date = { $in: [
                    `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
                    `${y}-${m}-${d}`
                ]};
            } else if (to) {
                // No from — use year prefix only
                query.date = { $regex: `^${to.getFullYear()}` };
            }
        } else {
            // Month/year mode (legacy) — required when no date range
            if (!month || !year) {
                return res.status(400).json({ success: false, message: 'Provide date_from/date_to or month+year' });
            }
            const monthNum = parseInt(month);
            const paddedMonth = String(monthNum).padStart(2, '0');
            // Match both zero-padded ("2026-04-05") and non-padded ("2026-4-5") formats
            const dateRegex = monthNum < 10
                ? `^${year}-(${monthNum}|${paddedMonth})-`
                : `^${year}-${paddedMonth}-`;
            query.date = { $regex: dateRegex };
        }

        if (company_id) {
            query.insurance_company_id = company_id;
        }

        const paddedMonth = month ? String(parseInt(month)).padStart(2, '0') : '';
        const patients = await Patient.find(query).sort({ date: 1, insurance_company_name: 1 });

        // Batch-fetch patient packages for all patients in the report
        const uniquePatientIds = [...new Set(patients.map(p => p.patient_id).filter(Boolean))];
        const patientPackages = uniquePatientIds.length > 0
            ? await PatientPackage.find({ patient_id: { $in: uniquePatientIds }, doctor_id })
                  .select('patient_id package_name total_sessions remaining_sessions status')
                  .lean()
            : [];

        // Build a map: patient_id -> array of packages
        const packagesByPatient = {};
        for (const pkg of patientPackages) {
            if (!packagesByPatient[pkg.patient_id]) {
                packagesByPatient[pkg.patient_id] = [];
            }
            packagesByPatient[pkg.patient_id].push(pkg);
        }

        // Group by company
        const grouped = {};
        for (const p of patients) {
            const cid = p.insurance_company_id || 'unknown';
            if (!grouped[cid]) {
                grouped[cid] = {
                    company_id: cid,
                    company_name: p.insurance_company_name || 'غير محدد',
                    coverage_percentage: p.coverage_percentage || 0,
                    patients: [],
                    total_full_fee: 0,
                    total_patient_paid: 0,
                    total_company_owes: 0,
                    total_count: 0
                };
            }

            // Full consultation fee saved when assistant marks patient as FINISHED
            const fullFee = p.consultation_fee || 0;

            const coveragePct = p.coverage_percentage || 0;
            const companyPays = Math.round(fullFee * coveragePct) / 100;
            const patientPays = fullFee - companyPays;

            // Attach package info: prefer active packages, then most recent
            const pkgs = packagesByPatient[p.patient_id] || [];
            const activePkgs = pkgs.filter(pk => pk.status === 'active');
            const relevantPkgs = activePkgs.length > 0 ? activePkgs : pkgs;
            const packageInfo = relevantPkgs.map(pk => ({
                package_name: pk.package_name,
                total_sessions: pk.total_sessions,
                remaining_sessions: pk.remaining_sessions,
                used_sessions: pk.total_sessions - pk.remaining_sessions,
                status: pk.status
            }));

            grouped[cid].patients.push({
                patient_id: p.patient_id,
                patient_name: p.patient_name,
                patient_phone: p.patient_phone,
                file_number: p.file_number,
                insurance_number: p.insurance_number,
                date: p.date,
                visit_type: p.visit_type,
                full_fee: fullFee,
                patient_paid: patientPays,
                company_owes: companyPays,
                coverage_percentage: coveragePct,
                packages: packageInfo
            });

            grouped[cid].total_full_fee += fullFee;
            grouped[cid].total_patient_paid += patientPays;
            grouped[cid].total_company_owes += companyPays;
            grouped[cid].total_count += 1;
        }

        const companies = Object.values(grouped);
        const totals = {
            total_patients: patients.length,
            total_full_fee: companies.reduce((s, c) => s + c.total_full_fee, 0),
            total_patient_paid: companies.reduce((s, c) => s + c.total_patient_paid, 0),
            total_company_owes: companies.reduce((s, c) => s + c.total_company_owes, 0)
        };

        res.status(200).json({
            success: true,
            data: {
                month: paddedMonth || null,
                year: year || null,
                date_from: date_from || null,
                date_to: date_to || null,
                doctor_id,
                companies,
                totals
            }
        });
    } catch (error) {
        console.error('Error generating insurance report:', error);
        res.status(500).json({ success: false, message: 'Error generating insurance report', error: error.message });
    }
};

const getAnalytics = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const { year } = req.query;

        if (!doctor_id || !year) {
            return res.status(400).json({ success: false, message: 'doctor_id and year are required' });
        }

        // Get all patients for this doctor in this year
        const allPatients = await Patient.find({
            doctor_id,
            date: { $regex: `^${year}` }
        }).select('payment_type date insurance_company_id insurance_company_name consultation_fee coverage_percentage');

        // Build monthly breakdown
        const monthlyData = {};
        for (let m = 1; m <= 12; m++) {
            const key = String(m).padStart(2, '0');
            monthlyData[key] = { month: m, cash_count: 0, insurance_count: 0, cash_revenue: 0, insurance_revenue: 0 };
        }

        for (const p of allPatients) {
            const monthStr = (p.date || '').slice(5, 7);
            if (!monthlyData[monthStr]) continue;

            const fee = p.consultation_fee || 0;

            if (p.payment_type === 'insurance') {
                monthlyData[monthStr].insurance_count += 1;
                monthlyData[monthStr].insurance_revenue += fee;
            } else {
                monthlyData[monthStr].cash_count += 1;
                monthlyData[monthStr].cash_revenue += fee;
            }
        }

        // Per-company totals for the year
        const companyMap = {};
        for (const p of allPatients.filter(x => x.payment_type === 'insurance')) {
            const cid = p.insurance_company_id || 'unknown';
            if (!companyMap[cid]) {
                companyMap[cid] = {
                    company_id: cid,
                    company_name: p.insurance_company_name || 'غير محدد',
                    patient_count: 0,
                    total_revenue: 0
                };
            }
            companyMap[cid].patient_count += 1;
        }

        res.status(200).json({
            success: true,
            data: {
                year,
                doctor_id,
                monthly: Object.values(monthlyData),
                by_company: Object.values(companyMap),
                summary: {
                    total_patients: allPatients.length,
                    insurance_patients: allPatients.filter(p => p.payment_type === 'insurance').length,
                    cash_patients: allPatients.filter(p => p.payment_type !== 'insurance').length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching insurance analytics:', error);
        res.status(500).json({ success: false, message: 'Error fetching insurance analytics', error: error.message });
    }
};

module.exports = {
    createCompany,
    getCompanies,
    updateCompany,
    deleteCompany,
    getMonthlyReport,
    getAnalytics
};
