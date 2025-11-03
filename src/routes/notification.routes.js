const express = require('express');
const router = express.Router();

const { asyncHandler, authUser } = require('../auth/checkAuth');

const controllerNotification = require('../controllers/notification.controller');

router.get('/notification', asyncHandler(controllerNotification.getNotification));
router.get('/notification-user', authUser, asyncHandler(controllerNotification.getNotificationByUserId));
router.get('/read-all-notification', authUser, asyncHandler(controllerNotification.readAllNotification));

module.exports = router;
