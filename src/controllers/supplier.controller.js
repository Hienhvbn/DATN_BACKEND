const modelSupplier = require('../models/supplier.model.js');
const { OK, Created } = require('../core/success.response');
const { BadRequestError, NotFoundError } = require('../core/error.response');
const { validateEmail, validatePhone, validateTaxCode, sanitizeInput, calculatePagination } = require('../utils');

class SupplierController {
    // Lấy danh sách nhà cung cấp
    async getSuppliers(req, res) {
        const { page = 1, limit = 10, search, status } = req.query;

        // Tạo filter
        const filter = {};
        if (search) {
            const sanitizedSearch = sanitizeInput(search);
            filter.$or = [
                { name: { $regex: sanitizedSearch, $options: 'i' } },
                { taxCode: { $regex: sanitizedSearch, $options: 'i' } },
                { email: { $regex: sanitizedSearch, $options: 'i' } },
            ];
        }
        if (status) {
            filter.status = status;
        }

        const total = await modelSupplier.countDocuments(filter);
        const pagination = calculatePagination(page, limit, total);

        const suppliers = await modelSupplier
            .find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit);

        new OK({
            message: 'Lấy danh sách nhà cung cấp thành công',
            metadata: {
                suppliers,
                pagination,
            },
        }).send(res);
    }

    // Lấy chi tiết nhà cung cấp
    async getSupplierById(req, res) {
        const { id } = req.params;

        const supplier = await modelSupplier.findById(id).populate('createdBy', 'name email');

        if (!supplier) {
            throw new NotFoundError('Không tìm thấy nhà cung cấp');
        }

        new OK({
            message: 'Lấy thông tin nhà cung cấp thành công',
            metadata: supplier,
        }).send(res);
    }

    // Tạo nhà cung cấp mới
    async createSupplier(req, res) {
        const { name, address, phone, email, taxCode, description } = req.body;
        const createdBy = req.user._id;

        // Validation
        if (!validateEmail(email)) {
            throw new BadRequestError('Email không hợp lệ');
        }

        if (!validatePhone(phone)) {
            throw new BadRequestError('Số điện thoại không hợp lệ (10-11 chữ số)');
        }

        if (!validateTaxCode(taxCode)) {
            throw new BadRequestError('Mã số thuế không hợp lệ (10-13 chữ số)');
        }

        // Sanitize input
        const sanitizedData = {
            name: sanitizeInput(name),
            address: sanitizeInput(address),
            phone: sanitizeInput(phone),
            email: sanitizeInput(email).toLowerCase(),
            taxCode: sanitizeInput(taxCode),
            description: sanitizeInput(description),
        };

        // Kiểm tra mã số thuế đã tồn tại
        const existingSupplier = await modelSupplier.findOne({ taxCode: sanitizedData.taxCode });
        if (existingSupplier) {
            throw new BadRequestError('Mã số thuế đã tồn tại');
        }

        // Kiểm tra email đã tồn tại
        const existingEmail = await modelSupplier.findOne({ email: sanitizedData.email });
        if (existingEmail) {
            throw new BadRequestError('Email đã tồn tại');
        }

        const supplier = await modelSupplier.create({
            ...sanitizedData,
            createdBy,
        });

        await supplier.populate('createdBy', 'name email');

        new Created({
            message: 'Tạo nhà cung cấp thành công',
            metadata: supplier,
        }).send(res);
    }

    // Cập nhật nhà cung cấp
    async updateSupplier(req, res) {
        const { id } = req.params;
        const { name, address, phone, email, taxCode, description, status } = req.body;

        const supplier = await modelSupplier.findById(id);
        if (!supplier) {
            throw new NotFoundError('Không tìm thấy nhà cung cấp');
        }

        // Validation nếu có thay đổi
        if (email && email !== supplier.email) {
            if (!validateEmail(email)) {
                throw new BadRequestError('Email không hợp lệ');
            }
        }

        if (phone && phone !== supplier.phone) {
            if (!validatePhone(phone)) {
                throw new BadRequestError('Số điện thoại không hợp lệ (10-11 chữ số)');
            }
        }

        if (taxCode && taxCode !== supplier.taxCode) {
            if (!validateTaxCode(taxCode)) {
                throw new BadRequestError('Mã số thuế không hợp lệ (10-13 chữ số)');
            }
        }

        // Sanitize input
        const sanitizedData = {};
        if (name) sanitizedData.name = sanitizeInput(name);
        if (address) sanitizedData.address = sanitizeInput(address);
        if (phone) sanitizedData.phone = sanitizeInput(phone);
        if (email) sanitizedData.email = sanitizeInput(email).toLowerCase();
        if (taxCode) sanitizedData.taxCode = sanitizeInput(taxCode);
        if (description !== undefined) sanitizedData.description = sanitizeInput(description);
        if (status) sanitizedData.status = status;

        // Kiểm tra mã số thuế đã tồn tại (trừ chính nó)
        if (taxCode && taxCode !== supplier.taxCode) {
            const existingSupplier = await modelSupplier.findOne({
                taxCode: sanitizedData.taxCode,
                _id: { $ne: id },
            });
            if (existingSupplier) {
                throw new BadRequestError('Mã số thuế đã tồn tại');
            }
        }

        // Kiểm tra email đã tồn tại (trừ chính nó)
        if (email && email !== supplier.email) {
            const existingEmail = await modelSupplier.findOne({
                email: sanitizedData.email,
                _id: { $ne: id },
            });
            if (existingEmail) {
                throw new BadRequestError('Email đã tồn tại');
            }
        }

        const updatedSupplier = await modelSupplier
            .findByIdAndUpdate(id, sanitizedData, { new: true, runValidators: true })
            .populate('createdBy', 'name email');

        new OK({
            message: 'Cập nhật nhà cung cấp thành công',
            metadata: updatedSupplier,
        }).send(res);
    }

    // Xóa nhà cung cấp
    async deleteSupplier(req, res) {
        const { id } = req.params;

        const supplier = await modelSupplier.findById(id);
        if (!supplier) {
            throw new NotFoundError('Không tìm thấy nhà cung cấp');
        }

        // TODO: Kiểm tra xem nhà cung cấp có đang được sử dụng trong phiếu nhập không
        // Nếu có thì không cho xóa, chỉ cho tạm dừng

        await modelSupplier.findByIdAndDelete(id);

        new OK({
            message: 'Xóa nhà cung cấp thành công',
        }).send(res);
    }

    // Tạm dừng/Kích hoạt nhà cung cấp
    async toggleSupplierStatus(req, res) {
        const { id } = req.params;

        const supplier = await modelSupplier.findById(id);
        if (!supplier) {
            throw new NotFoundError('Không tìm thấy nhà cung cấp');
        }

        const newStatus = supplier.status === 'active' ? 'inactive' : 'active';

        const updatedSupplier = await modelSupplier
            .findByIdAndUpdate(id, { status: newStatus }, { new: true })
            .populate('createdBy', 'name email');

        new OK({
            message: `Nhà cung cấp đã được ${newStatus === 'active' ? 'kích hoạt' : 'tạm dừng'}`,
            metadata: updatedSupplier,
        }).send(res);
    }
}

module.exports = new SupplierController();
