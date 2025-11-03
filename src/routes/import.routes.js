const express = require('express');
const router = express.Router();

const controllerImport = require('../controllers/import.controller');
const { authAdmin } = require('../auth/checkAuth');
const { asyncHandler } = require('../auth/checkAuth');

// Lấy danh sách phiếu nhập hàng
router.get('/', authAdmin, asyncHandler(controllerImport.getImports));

// Lấy chi tiết phiếu nhập hàng
router.get('/:id', authAdmin, asyncHandler(controllerImport.getImportById));

// Tạo phiếu nhập hàng mới
router.post('/', authAdmin, asyncHandler(controllerImport.createImport));

// Cập nhật phiếu nhập hàng
router.put('/:id', authAdmin, asyncHandler(controllerImport.updateImport));

// Xác nhận phiếu nhập hàng (cập nhật tồn kho)
router.patch('/:id/confirm', authAdmin, asyncHandler(controllerImport.confirmImport));

// Hủy phiếu nhập hàng
router.patch('/:id/cancel', authAdmin, asyncHandler(controllerImport.cancelImport));

// Xóa phiếu nhập hàng
router.delete('/:id', authAdmin, asyncHandler(controllerImport.deleteImport));

// Lấy thống kê nhập hàng
router.get('/stats/overview', authAdmin, asyncHandler(controllerImport.getImportStats));

module.exports = router;
