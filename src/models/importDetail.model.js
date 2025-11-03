const { model, Schema } = require('mongoose');

const importDetailSchema = new Schema(
    {
        importId: {
            type: Schema.Types.ObjectId,
            ref: 'Import',
            required: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        importPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = model('ImportDetail', importDetailSchema);
