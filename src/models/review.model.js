const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId, // tham chiếu đến User
            ref: 'user',
            required: true,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId, // tham chiếu đến Product
            ref: 'product',
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1, // tối thiểu 1 sao
            max: 5, // tối đa 5 sao
        },
    },
    {
        timestamps: true, // tự động thêm createdAt, updatedAt
    },
);

const Review = mongoose.model('review', reviewSchema);
module.exports = Review;
