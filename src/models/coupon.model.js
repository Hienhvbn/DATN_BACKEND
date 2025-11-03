const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
    {
        nameCoupon: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        discount: {
            type: Number, // phần trăm giảm giá hoặc số tiền giảm
            required: true,
            min: 0,
        },
        quantity: {
            type: Number, // số lượng mã còn lại
            required: true,
            min: 0,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        minPrice: {
            type: Number, // giá tối thiểu để áp dụng mã
            required: true,
            min: 0,
        },
        // Điều kiện áp dụng cho sản phẩm cụ thể
        applicableProducts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'product',
            },
        ],
        // Điều kiện áp dụng cho danh mục sản phẩm
        applicableCategories: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'category',
            },
        ],
        // Loại áp dụng: 'all' (tất cả), 'products' (sản phẩm cụ thể), 'categories' (danh mục)
        applyType: {
            type: String,
            enum: ['all', 'products', 'categories'],
            default: 'all',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, // tự động tạo createdAt, updatedAt
    },
);

const Coupon = mongoose.model('coupon', couponSchema);
module.exports = Coupon;
