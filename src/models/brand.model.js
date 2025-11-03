const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
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
        website: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true, // tự thêm createdAt, updatedAt
    },
);

const Brand = mongoose.model('brand', brandSchema);
module.exports = Brand;
