const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: false,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        paymentId: {
            type: String,
            ref: 'payment',
            required: false,
        },
    },
    {
        timestamps: true,
    },
);

const Notification = mongoose.model('notification', notificationSchema);
module.exports = Notification;
