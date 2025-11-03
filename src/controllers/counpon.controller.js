const Coupon = require('../models/coupon.model');
const Cart = require('../models/cart.model');
const Product = require('../models/products.model');
const Category = require('../models/category.model');
const { AuthFailureError, BadRequestError, NotFoundError } = require('../core/error.response');
const { OK } = require('../core/success.response');
const mongoose = require('mongoose');

class CouponController {
    async createCoupon(req, res) {
        const {
            nameCoupon,
            discount,
            quantity,
            startDate,
            endDate,
            minPrice,
            applicableProducts,
            applicableCategories,
            applyType,
        } = req.body;

        // Kiểm tra đầu vào
        if (!nameCoupon || !discount || !quantity || !startDate || !endDate || !minPrice) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }

        // Kiểm tra applyType và các field liên quan
        if (applyType === 'products' && (!applicableProducts || applicableProducts.length === 0)) {
            throw new BadRequestError('Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá');
        }

        if (applyType === 'categories' && (!applicableCategories || applicableCategories.length === 0)) {
            throw new BadRequestError('Vui lòng chọn ít nhất một danh mục để áp dụng mã giảm giá');
        }

        // Tạo coupon mới
        const newCoupon = await Coupon.create({
            nameCoupon,
            discount,
            quantity,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            minPrice,
            applicableProducts: applicableProducts || [],
            applicableCategories: applicableCategories || [],
            applyType: applyType || 'all',
        });

        return new OK({
            message: 'Tạo mã giảm giá thành công',
            metadata: newCoupon,
        }).send(res);
    }

    async getAllCoupon(req, res) {
        const coupons = await Coupon.find(); // Lấy tất cả coupon
        return new OK({
            message: 'Lấy tất cả mã giảm giá thành công',
            metadata: coupons,
        }).send(res);
    }

    async updateCoupon(req, res) {
        const {
            _id,
            nameCoupon,
            discount,
            quantity,
            startDate,
            endDate,
            minPrice,
            applicableProducts,
            applicableCategories,
            applyType,
            isActive,
        } = req.body;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            throw new BadRequestError('ID mã giảm giá không hợp lệ');
        }

        // Kiểm tra applyType và các field liên quan
        if (applyType === 'products' && (!applicableProducts || applicableProducts.length === 0)) {
            throw new BadRequestError('Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá');
        }

        if (applyType === 'categories' && (!applicableCategories || applicableCategories.length === 0)) {
            throw new BadRequestError('Vui lòng chọn ít nhất một danh mục để áp dụng mã giảm giá');
        }

        // Cập nhật coupon
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            _id,
            {
                nameCoupon,
                discount,
                quantity,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                minPrice,
                applicableProducts: applicableProducts || [],
                applicableCategories: applicableCategories || [],
                applyType: applyType || 'all',
                isActive: isActive !== undefined ? isActive : true,
            },
            { new: true }, // Trả về document đã cập nhật
        );

        if (!updatedCoupon) {
            throw new NotFoundError('Mã giảm giá không tồn tại');
        }

        return new OK({
            message: 'Cập nhật mã giảm giá thành công',
            metadata: updatedCoupon,
        }).send(res);
    }

    async deleteCoupon(req, res) {
        const { _id } = req.body;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            throw new BadRequestError('ID mã giảm giá không hợp lệ');
        }

        const deletedCoupon = await Coupon.findByIdAndDelete(_id);
        if (!deletedCoupon) {
            throw new NotFoundError('Mã giảm giá không tồn tại');
        }

        return new OK({
            message: 'Xóa mã giảm giá thành công',
        }).send(res);
    }

    async addCouponToCart(req, res) {
        const { _id: userId } = req.user;
        const { idCoupon } = req.body;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(idCoupon)) {
            throw new BadRequestError('ID mã giảm giá không hợp lệ');
        }

        // Tìm coupon
        const findCoupon = await Coupon.findById(idCoupon)
            .populate('applicableProducts')
            .populate('applicableCategories');
        if (!findCoupon) {
            throw new NotFoundError('Mã giảm giá không tồn tại');
        }

        // Kiểm tra coupon còn hiệu lực
        if (!findCoupon.isActive || findCoupon.quantity <= 0 || new Date() > findCoupon.endDate) {
            throw new BadRequestError('Mã giảm giá không hợp lệ hoặc đã hết hạn');
        }

        // Tìm giỏ hàng của user
        const findCart = await Cart.find({ userId }).populate('productId');
        if (!findCart.length) {
            throw new NotFoundError('Giỏ hàng trống');
        }

        // Kiểm tra điều kiện áp dụng mã giảm giá
        let applicableItems = [];

        if (findCoupon.applyType === 'all') {
            // Áp dụng cho tất cả sản phẩm
            applicableItems = findCart;
        } else if (findCoupon.applyType === 'products') {
            // Áp dụng cho sản phẩm cụ thể
            const productIds = findCoupon.applicableProducts.map((p) => p._id.toString());
            applicableItems = findCart.filter((item) => productIds.includes(item.productId._id.toString()));
        } else if (findCoupon.applyType === 'categories') {
            // Áp dụng cho danh mục sản phẩm
            const categoryIds = findCoupon.applicableCategories.map((c) => c._id.toString());
            applicableItems = findCart.filter((item) => {
                const productCategory = item.productId.category;
                if (!productCategory) return false;

                // Xử lý cả trường hợp category là object hoặc string
                const categoryId =
                    typeof productCategory === 'object' && productCategory !== null
                        ? productCategory._id?.toString()
                        : productCategory?.toString();

                return categoryIds.includes(categoryId);
            });
        }

        if (applicableItems.length === 0) {
            throw new BadRequestError('Mã giảm giá này không áp dụng cho sản phẩm trong giỏ hàng của bạn');
        }

        // Cập nhật nameCoupon cho các mục áp dụng được
        const updateCart = await Promise.all(
            applicableItems.map(async (item) => {
                item.nameCoupon = findCoupon.nameCoupon;
                return await item.save();
            }),
        );

        return new OK({
            message: 'Thêm mã giảm giá vào giỏ hàng thành công',
            metadata: updateCart,
        }).send(res);
    }

    // Lấy danh sách sản phẩm để chọn khi tạo coupon
    async getProductsForCoupon(req, res) {
        const products = await Product.find({}, '_id name price');
        return new OK({
            message: 'Lấy danh sách sản phẩm thành công',
            metadata: products,
        }).send(res);
    }

    // Lấy danh sách danh mục để chọn khi tạo coupon
    async getCategoriesForCoupon(req, res) {
        const categories = await Category.find({}, '_id name');
        return new OK({
            message: 'Lấy danh sách danh mục thành công',
            metadata: categories,
        }).send(res);
    }
}

module.exports = new CouponController();
