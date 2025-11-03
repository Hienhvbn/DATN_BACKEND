const express = require('express');
const router = express.Router();

const controllerSupplier = require('../controllers/supplier.controller');
const { authAdmin, asyncHandler } = require('../auth/checkAuth');

// Lấy danh sách nhà cung cấp
router.get('/', authAdmin, asyncHandler(controllerSupplier.getSuppliers));

// Lấy chi tiết nhà cung cấp
router.get('/:id', authAdmin, asyncHandler(controllerSupplier.getSupplierById));

// Tạo nhà cung cấp mới
router.post('/', authAdmin, asyncHandler(controllerSupplier.createSupplier));

// Cập nhật nhà cung cấp
router.put('/:id', authAdmin, asyncHandler(controllerSupplier.updateSupplier));

// Xóa nhà cung cấp
router.delete('/:id', authAdmin, asyncHandler(controllerSupplier.deleteSupplier));

// Tạm dừng/Kích hoạt nhà cung cấp
router.patch('/:id/toggle-status', authAdmin, asyncHandler(controllerSupplier.toggleSupplierStatus));

module.exports = router;
