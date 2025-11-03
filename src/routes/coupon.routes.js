const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');

const controllerCoupon = require('../controllers/counpon.controller.js');

router.post('/create', authAdmin, asyncHandler(controllerCoupon.createCoupon));
router.get('/get-all-coupon', asyncHandler(controllerCoupon.getAllCoupon));
router.post('/update', authAdmin, asyncHandler(controllerCoupon.updateCoupon));
router.post('/delete', authAdmin, asyncHandler(controllerCoupon.deleteCoupon));
router.post('/add-coupon-to-cart', authUser, asyncHandler(controllerCoupon.addCouponToCart));
router.get('/get-products', authAdmin, asyncHandler(controllerCoupon.getProductsForCoupon));
router.get('/get-categories', authAdmin, asyncHandler(controllerCoupon.getCategoriesForCoupon));

module.exports = router;
