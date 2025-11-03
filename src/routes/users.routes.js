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

const { authUser, asyncHandler, authAdmin } = require('../auth/checkAuth.js');

const controllerUser = require('../controllers/user.controller.js');

router.post('/register', asyncHandler(controllerUser.registerUser));
router.post('/login', asyncHandler(controllerUser.loginUser));
router.post('/login-admin', asyncHandler(controllerUser.loginAdmin));
router.get('/auth', authUser, asyncHandler(controllerUser.authUser));
router.get('/refresh-token', asyncHandler(controllerUser.refreshToken));
router.get('/logout', authUser, asyncHandler(controllerUser.logout));
router.get('/logout-admin', authAdmin, asyncHandler(controllerUser.logoutAdmin));
router.get('/check-admin-auth', authAdmin, asyncHandler(controllerUser.checkAdminAuth));
router.post('/update-user', authUser, asyncHandler(controllerUser.updateInfoUser));
router.post('/login-google', asyncHandler(controllerUser.loginGoogle));
router.get('/get-users', authAdmin, asyncHandler(controllerUser.getUsers));
router.post('/update-user-admin', authAdmin, asyncHandler(controllerUser.updateUser));
router.post('/delete-user', authAdmin, asyncHandler(controllerUser.deleteUser));
router.post('/upload-image', upload.single('image'), authUser, asyncHandler(controllerUser.changeAvatar));
router.post('/create-user', asyncHandler(controllerUser.createUser));
router.get('/statistic', authAdmin, asyncHandler(controllerUser.getStatistic));

// Favorites routes
router.post('/add-favorite', authUser, asyncHandler(controllerUser.addToFavorites));
router.delete('/remove-favorite/:productId', authUser, asyncHandler(controllerUser.removeFromFavorites));
router.get('/favorites', authUser, asyncHandler(controllerUser.getFavorites));

module.exports = router;
