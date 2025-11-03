const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId, // tham chiếu sang bảng User trong MongoDB
            required: true,
            ref: 'user',
        },
        publicKey: {
            type: String,
            required: true,
        },
        privateKey: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true, // tự động thêm createdAt, updatedAt
    },
);

// Tạo model ApiKey
const Apikey = mongoose.model('apikey', apiKeySchema);
module.exports = Apikey;
