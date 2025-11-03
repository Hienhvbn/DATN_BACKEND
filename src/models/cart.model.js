const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId, // tham chiếu User
            ref: 'user',
            required: true,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId, // tham chiếu Product
            ref: 'product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        totalPrice: {
            type: Number,
            required: true,
        },
        nameCoupon: {
            type: String,
        },
    },
    { timestamps: true },
);

const Cart = mongoose.model('cart', cartSchema);
module.exports = Cart;
