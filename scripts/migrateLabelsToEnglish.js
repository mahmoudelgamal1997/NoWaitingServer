/**
 * One-time migration: translate Arabic labels → English in MongoDB.
 *
 * Safe rules:
 *  - Only field_id / section_id values that exist in the default English
 *    template are translated. Custom doctor fields keep their original label.
 *  - Existing patient data values (the actual answers) are NEVER touched.
 *  - Each document is updated individually; a failure on one does not stop others.
 *  - Run with --dry-run to preview changes without writing anything.
 *
 * Usage:
 *   node scripts/migrateLabelsToEnglish.js
 *   node scripts/migrateLabelsToEnglish.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const HistoryTemplate      = require('../models/HistoryTemplate');
const PatientMedicalHistory = require('../models/PatientMedicalHistory');
const { translateTemplate } = require('../utils/translateTemplate');

const DRY_RUN = process.argv.includes('--dry-run');

async function migrateTemplates() {
    const templates = await HistoryTemplate.find({});
    console.log(`\nFound ${templates.length} HistoryTemplate document(s).`);

    let updated = 0;
    let skipped = 0;

    for (const tmpl of templates) {
        const translated = translateTemplate(tmpl);

        // Check whether anything actually changed
        const originalJson = JSON.stringify(tmpl.toObject().sections);
        const translatedJson = JSON.stringify(translated.sections);

        if (originalJson === translatedJson) {
            console.log(`  [SKIP] Template ${tmpl._id} (doctor: ${tmpl.doctor_id}) — already in English`);
            skipped++;
            continue;
        }

        console.log(`  [UPDATE] Template ${tmpl._id} (doctor: ${tmpl.doctor_id})`);

        if (!DRY_RUN) {
            tmpl.sections = translated.sections;
            await tmpl.save();
        }
        updated++;
    }

    console.log(`\nTemplates — updated: ${updated}, skipped: ${skipped}`);
}

async function migrateHistoryRecords() {
    const records = await PatientMedicalHistory.find({
        template_snapshot: { $exists: true, $ne: null }
    });
    console.log(`\nFound ${records.length} PatientMedicalHistory document(s) with a template_snapshot.`);

    let updated = 0;
    let skipped = 0;
    let errored = 0;

    for (const record of records) {
        try {
            const translated = translateTemplate(record.template_snapshot);

            const originalJson  = JSON.stringify(record.template_snapshot);
            const translatedJson = JSON.stringify(translated);

            if (originalJson === translatedJson) {
                skipped++;
                continue;
            }

            console.log(`  [UPDATE] History ${record._id} (patient: ${record.patient_id})`);

            if (!DRY_RUN) {
                record.template_snapshot = translated;
                await record.save();
            }
            updated++;
        } catch (err) {
            console.error(`  [ERROR]  History ${record._id} — ${err.message}`);
            errored++;
        }
    }

    console.log(`\nHistory records — updated: ${updated}, skipped: ${skipped}, errors: ${errored}`);
}

async function main() {
    if (DRY_RUN) console.log('\n=== DRY RUN — no data will be written ===');

    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('MongoDB connected.');

    await migrateTemplates();
    await migrateHistoryRecords();

    await mongoose.disconnect();
    console.log('\nDone. MongoDB disconnected.');
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
