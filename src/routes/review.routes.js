const express = require('express');
const router = express.Router();

const { asyncHandler, authUser } = require('../auth/checkAuth.js');

const controllerReview = require('../controllers/review.controller.js');

router.post('/create', authUser, asyncHandler(controllerReview.createReview));
router.get('/get', asyncHandler(controllerReview.getReview));
router.get('/product-reviews', asyncHandler(controllerReview.getReviewByProductId));
router.get('/all-reviews', asyncHandler(controllerReview.getAllReview));

module.exports = router;
