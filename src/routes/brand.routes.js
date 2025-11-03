const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');
const { fileURLToPath } = require('url');
const multer = require('multer');

// Ensure temp directory exists
const ensureTempDir = () => {
    const tempDir = path.join(__dirname, '../public/temp/');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
};

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        // Ensure temp directory exists before using it
        try {
            const tempDir = ensureTempDir();
            callback(null, tempDir);
        } catch (error) {
            console.error('Error creating temp directory:', error);
            callback(error, null);
        }
    },
    filename: function (req, file, callback) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, extension);
        callback(null, uniqueSuffix + '-' + nameWithoutExt + extension);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, callback) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            callback(null, true);
        } else {
            callback(new Error('Only image files are allowed'), false);
        }
    },
});
const controllerBrand = require('../controllers/brand.controller.js');

const { asyncHandler, authAdmin } = require('../auth/checkAuth');

router.post('/upload', upload.single('image'), authAdmin, asyncHandler(controllerBrand.uploadImage));
router.post('/create', upload.single('image'), authAdmin, asyncHandler(controllerBrand.createBrand));
router.post('/update', upload.single('image'), authAdmin, asyncHandler(controllerBrand.updateBrand));
router.get('/gets', asyncHandler(controllerBrand.getBrands));
router.post('/delete', authAdmin, asyncHandler(controllerBrand.deleteBrand));

module.exports = router;
