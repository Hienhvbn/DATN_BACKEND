const modelImport = require('../models/import.model.js');
const modelImportDetail = require('../models/importDetail.model.js');
const modelSupplier = require('../models/supplier.model.js');
const modelProduct = require('../models/products.model.js');
const { OK, Created } = require('../core/success.response');
const { BadRequestError, NotFoundError } = require('../core/error.response');
const { generateImportCode, calculatePagination, sanitizeInput } = require('../utils');

class ImportController {
    // Lấy danh sách phiếu nhập hàng
    async getImports(req, res) {
        const { page = 1, limit = 10, search, status, supplierId, startDate, endDate } = req.query;

        // Tạo filter
        const filter = {};
        if (search) {
            const sanitizedSearch = sanitizeInput(search);
            filter.$or = [
                { importCode: { $regex: sanitizedSearch, $options: 'i' } },
                { notes: { $regex: sanitizedSearch, $options: 'i' } },
            ];
        }
        if (status) {
            filter.status = status;
        }
        if (supplierId) {
            filter.supplierId = supplierId;
        }
        if (startDate || endDate) {
            filter.importDate = {};
            if (startDate) filter.importDate.$gte = new Date(startDate);
            if (endDate) filter.importDate.$lte = new Date(endDate);
        }

        const total = await modelImport.countDocuments(filter);
        const pagination = calculatePagination(page, limit, total);

        const imports = await modelImport
            .find(filter)
            .populate('supplierId', 'name taxCode')
            .populate('createdBy', 'name email')
            .sort({ importDate: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit);

        new OK({
            message: 'Lấy danh sách phiếu nhập hàng thành công',
            metadata: {
                imports,
                pagination,
            },
        }).send(res);
    }

    // Lấy chi tiết phiếu nhập hàng
    async getImportById(req, res) {
        const { id } = req.params;

        const importData = await modelImport
            .findById(id)
            .populate('supplierId', 'name taxCode address phone email')
            .populate('createdBy', 'name email');

        if (!importData) {
            throw new NotFoundError('Không tìm thấy phiếu nhập hàng');
        }

        // Lấy chi tiết sản phẩm
        const importDetails = await modelImportDetail
            .find({ importId: id })
            .populate('productId', 'name price images categoryId brandId');

        new OK({
            message: 'Lấy chi tiết phiếu nhập hàng thành công',
            metadata: {
                import: importData,
                details: importDetails,
            },
        }).send(res);
    }

    // Tạo phiếu nhập hàng mới
    async createImport(req, res) {
        const { supplierId, notes, products } = req.body;
        const createdBy = req.user._id;

        // Kiểm tra nhà cung cấp tồn tại
        const supplier = await modelSupplier.findById(supplierId);
        if (!supplier) {
            throw new NotFoundError('Không tìm thấy nhà cung cấp');
        }

        if (supplier.status !== 'active') {
            throw new BadRequestError('Nhà cung cấp đang tạm dừng hoạt động');
        }

        // Kiểm tra sản phẩm
        if (!products || products.length === 0) {
            throw new BadRequestError('Danh sách sản phẩm không được để trống');
        }

        // Validate và tính toán tổng tiền
        let totalAmount = 0;
        const validatedProducts = [];

        for (const product of products) {
            const { productId, quantity, importPrice } = product;

            // Kiểm tra sản phẩm tồn tại
            const productData = await modelProduct.findById(productId);
            if (!productData) {
                throw new NotFoundError(`Không tìm thấy sản phẩm với ID: ${productId}`);
            }

            if (quantity <= 0) {
                throw new BadRequestError('Số lượng phải lớn hơn 0');
            }

            if (importPrice < 0) {
                throw new BadRequestError('Giá nhập phải lớn hơn hoặc bằng 0');
            }

            const totalPrice = quantity * importPrice;
            totalAmount += totalPrice;

            validatedProducts.push({
                productId,
                quantity,
                importPrice,
                totalPrice,
            });
        }

        // Tạo phiếu nhập hàng
        const importCode = generateImportCode();
        const importData = await modelImport.create({
            importCode,
            supplierId,
            totalAmount,
            notes: sanitizeInput(notes),
            createdBy,
        });

        // Tạo chi tiết nhập hàng
        const importDetails = [];
        for (const product of validatedProducts) {
            const detail = await modelImportDetail.create({
                importId: importData._id,
                productId: product.productId,
                quantity: product.quantity,
                importPrice: product.importPrice,
                totalPrice: product.totalPrice,
            });
            importDetails.push(detail);
        }

        // Populate để trả về đầy đủ thông tin
        await importData.populate('supplierId', 'name taxCode');
        await importData.populate('createdBy', 'name email');

        new Created({
            message: 'Tạo phiếu nhập hàng thành công',
            metadata: {
                import: importData,
                details: importDetails,
            },
        }).send(res);
    }

    // Cập nhật phiếu nhập hàng (chỉ khi status = pending)
    async updateImport(req, res) {
        const { id } = req.params;
        const { notes, status } = req.body;

        const importData = await modelImport.findById(id);
        if (!importData) {
            throw new NotFoundError('Không tìm thấy phiếu nhập hàng');
        }

        if (importData.status !== 'pending') {
            throw new BadRequestError('Chỉ có thể cập nhật phiếu nhập hàng đang chờ xử lý');
        }

        const updateData = {};
        if (notes !== undefined) updateData.notes = sanitizeInput(notes);
        if (status) updateData.status = status;

        const updatedImport = await modelImport
            .findByIdAndUpdate(id, updateData, { new: true })
            .populate('supplierId', 'name taxCode')
            .populate('createdBy', 'name email');

        new OK({
            message: 'Cập nhật phiếu nhập hàng thành công',
            metadata: updatedImport,
        }).send(res);
    }

    // Xác nhận phiếu nhập hàng (cập nhật tồn kho)
    async confirmImport(req, res) {
        const { id } = req.params;

        const importData = await modelImport.findById(id);
        if (!importData) {
            throw new NotFoundError('Không tìm thấy phiếu nhập hàng');
        }

        if (importData.status !== 'pending') {
            throw new BadRequestError('Phiếu nhập hàng đã được xử lý');
        }

        // Lấy chi tiết sản phẩm
        const importDetails = await modelImportDetail.find({ importId: id });

        // Cập nhật tồn kho cho từng sản phẩm
        for (const detail of importDetails) {
            await modelProduct.findByIdAndUpdate(
                detail.productId,
                {
                    $inc: { quantity: detail.quantity },
                    $set: {
                        lastImportDate: new Date(),
                        lastImportQuantity: detail.quantity,
                        costPrice: detail.importPrice,
                    },
                },
                { new: true },
            );
        }

        // Cập nhật trạng thái phiếu nhập
        const updatedImport = await modelImport
            .findByIdAndUpdate(id, { status: 'completed' }, { new: true })
            .populate('supplierId', 'name taxCode')
            .populate('createdBy', 'name email');

        new OK({
            message: 'Xác nhận phiếu nhập hàng thành công',
            metadata: updatedImport,
        }).send(res);
    }

    // Hủy phiếu nhập hàng
    async cancelImport(req, res) {
        const { id } = req.params;

        const importData = await modelImport.findById(id);
        if (!importData) {
            throw new NotFoundError('Không tìm thấy phiếu nhập hàng');
        }

        if (importData.status !== 'pending') {
            throw new BadRequestError('Chỉ có thể hủy phiếu nhập hàng đang chờ xử lý');
        }

        const updatedImport = await modelImport
            .findByIdAndUpdate(id, { status: 'cancelled' }, { new: true })
            .populate('supplierId', 'name taxCode')
            .populate('createdBy', 'name email');

        new OK({
            message: 'Hủy phiếu nhập hàng thành công',
            metadata: updatedImport,
        }).send(res);
    }

    // Xóa phiếu nhập hàng (chỉ khi status = pending)
    async deleteImport(req, res) {
        const { id } = req.params;

        const importData = await modelImport.findById(id);
        if (!importData) {
            throw new NotFoundError('Không tìm thấy phiếu nhập hàng');
        }

        if (importData.status !== 'pending') {
            throw new BadRequestError('Chỉ có thể xóa phiếu nhập hàng đang chờ xử lý');
        }

        // Xóa chi tiết nhập hàng
        await modelImportDetail.deleteMany({ importId: id });

        // Xóa phiếu nhập hàng
        await modelImport.findByIdAndDelete(id);

        new OK({
            message: 'Xóa phiếu nhập hàng thành công',
        }).send(res);
    }

    // Lấy thống kê nhập hàng
    async getImportStats(req, res) {
        const { startDate, endDate } = req.query;

        const filter = {};
        if (startDate || endDate) {
            filter.importDate = {};
            if (startDate) filter.importDate.$gte = new Date(startDate);
            if (endDate) filter.importDate.$lte = new Date(endDate);
        }

        const stats = await modelImport.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' },
                },
            },
        ]);

        const totalImports = await modelImport.countDocuments(filter);
        const totalAmount = await modelImport.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);

        new OK({
            message: 'Lấy thống kê nhập hàng thành công',
            metadata: {
                stats,
                totalImports,
                totalAmount: totalAmount[0]?.total || 0,
            },
        }).send(res);
    }
}

module.exports = new ImportController();
