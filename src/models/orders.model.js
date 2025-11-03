const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
        items: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'product',
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                totalPrice: {
                    type: Number,
                    required: true,
                },
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirm', 'shipping', 'success', 'failed'],
            default: 'pending',
        },
        typePayment: {
            type: String,
            enum: ['cod', 'momo', 'vnpay'],
            required: true,
        },
        nameCoupon: {
            type: String,
            default: null,
        },
        note: {
            type: String,
            default: '',
        },
    },
    { timestamps: true },
);

const Order = mongoose.model('order', orderSchema);
module.exports = Order;
