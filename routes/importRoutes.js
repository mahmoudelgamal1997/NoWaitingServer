const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
    importLegacyData,
    getImportBatches,
    rollbackImportBatch
} = require('../controllers/importController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
        }
    }
});

router.post('/import/legacy', upload.single('file'), importLegacyData);
router.get('/import/batches', getImportBatches);
router.delete('/import/batches/:batchId', rollbackImportBatch);

module.exports = router;
