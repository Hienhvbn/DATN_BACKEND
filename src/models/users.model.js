const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        avatar: {
            type: String,
            default: null,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            default: null,
        },
        address: {
            type: String,
            default: null,
        },
        birthDay: {
            type: Date,
            default: null,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        password: {
            type: String,
            default: null,
        },
        role: {
            type: String,
            enum: ['admin', 'user'],
            default: 'user',
        },
        typeLogin: {
            type: String,
            enum: ['google', 'email'],
            required: true,
        },
        isOnline: {
            type: String,
            enum: ['online', 'offline'],
            default: 'online',
        },
        favorites: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'product',
            },
        ],
    },
    {
        timestamps: true, // tự thêm createdAt, updatedAt
    },
);

// Export Model
const User = mongoose.model('user', userSchema);
module.exports = User;
