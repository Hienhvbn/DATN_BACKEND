const express = require('express');
const router = express.Router();

const controllerOrders = require('../controllers/orders.controller');

const { authUser, authAdmin, asyncHandler } = require('../auth/checkAuth');

router.post('/create', authUser, asyncHandler(controllerOrders.createOrder));
router.get('/momo', asyncHandler(controllerOrders.momoCallback));
router.get('/vnpay', asyncHandler(controllerOrders.vnpayCallback));
router.get('/order', asyncHandler(controllerOrders.getOrderById));
router.get('/orders', authUser, asyncHandler(controllerOrders.getOrdersByUserId));
router.post('/cancel', authUser, asyncHandler(controllerOrders.cancelOrder));
router.get('/orders-admin', authAdmin, asyncHandler(controllerOrders.getAllOrders));
router.post('/update-status', authAdmin, asyncHandler(controllerOrders.updateOrderStatus));

module.exports = router;
