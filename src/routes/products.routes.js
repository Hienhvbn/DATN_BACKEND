const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

const { asyncHandler, authAdmin } = require('../auth/checkAuth');

const controllerProducts = require('../controllers/products.controller');

router.post('/create', authAdmin, asyncHandler(controllerProducts.createProduct));
router.post('/uploads', upload.array('images'), authAdmin, asyncHandler(controllerProducts.uploadsImage));
router.get('/product', asyncHandler(controllerProducts.getProductById));
router.get('/search', asyncHandler(controllerProducts.searchProduct));
router.post('/update', authAdmin, asyncHandler(controllerProducts.updateProduct));
router.post('/delete', authAdmin, asyncHandler(controllerProducts.deleteProduct));

router.get('/all', asyncHandler(controllerProducts.getAllProducts));
router.get('/best-selling', asyncHandler(controllerProducts.getTopBestSellingProducts));
router.get('/category', asyncHandler(controllerProducts.getProductByCategory));

// ========== STOCK MANAGEMENT ROUTES ==========
router.patch('/:id/stock/update', authAdmin, asyncHandler(controllerProducts.updateProductStock));
router.patch('/:id/stock/increase', authAdmin, asyncHandler(controllerProducts.increaseStock));
router.patch('/:id/stock/decrease', authAdmin, asyncHandler(controllerProducts.decreaseStock));
router.get('/stock/out-of-stock', authAdmin, asyncHandler(controllerProducts.getOutOfStockProducts));
router.get('/stock/low-stock', authAdmin, asyncHandler(controllerProducts.getLowStockProducts));
router.get('/stock/stats', authAdmin, asyncHandler(controllerProducts.getStockStats));
router.patch('/:id/stock/settings', authAdmin, asyncHandler(controllerProducts.updateMinQuantity));

module.exports = router;
