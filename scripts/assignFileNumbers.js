/**
 * One-time migration: assign a unique 5-digit file_number to every patient
 * that does not already have one.
 *
 * Safe rules:
 *  - Only patients where file_number is null / undefined are updated.
 *  - Patient data (visits, receipts, etc.) is never touched.
 *  - Each document is updated individually; errors on one don't stop others.
 *  - Run with --dry-run to preview without writing.
 *
 * Usage:
 *   node scripts/assignFileNumbers.js
 *   node scripts/assignFileNumbers.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Patient = require('../models/patient');

const DRY_RUN = process.argv.includes('--dry-run');

const generateUniqueFileNumber = async (usedNumbers) => {
    let fileNumber;
    let attempts = 0;
    do {
        fileNumber = String(Math.floor(10000 + Math.random() * 90000));
        attempts++;
    } while (usedNumbers.has(fileNumber) && attempts < 200);
    usedNumbers.add(fileNumber);
    return fileNumber;
};

async function main() {
    if (DRY_RUN) console.log('\n=== DRY RUN — no data will be written ===');

    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('MongoDB connected.');

    // Collect all already-assigned file numbers to guarantee uniqueness
    const existingNumbers = await Patient.distinct('file_number', { file_number: { $ne: null } });
    const usedNumbers = new Set(existingNumbers);
    console.log(`\nPre-existing file numbers in DB: ${usedNumbers.size}`);

    // Find patients without a file number
    const patients = await Patient.find({ $or: [{ file_number: null }, { file_number: { $exists: false } }] }).lean();
    console.log(`Patients needing a file number: ${patients.length}`);

    let updated = 0;
    let errored = 0;

    for (const patient of patients) {
        try {
            const fileNumber = await generateUniqueFileNumber(usedNumbers);
            console.log(`  [${DRY_RUN ? 'DRY' : 'UPDATE'}] ${patient.patient_name} (${patient.patient_id}) → رقم ملف: ${fileNumber}`);

            if (!DRY_RUN) {
                await Patient.updateOne({ _id: patient._id }, { $set: { file_number: fileNumber } });
            }
            updated++;
        } catch (err) {
            console.error(`  [ERROR] ${patient._id} — ${err.message}`);
            errored++;
        }
    }

    console.log(`\nDone — assigned: ${updated}, errors: ${errored}`);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
