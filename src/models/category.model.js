const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true, // loại bỏ khoảng trắng dư
        },
        image: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true, // tự thêm createdAt, updatedAt
    },
);

const Category = mongoose.model('category', categorySchema);
module.exports = Category;
