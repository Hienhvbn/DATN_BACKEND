const { model, Schema } = require('mongoose');

const importSchema = new Schema(
    {
        importCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        supplierId: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier',
            required: true,
        },
        importDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        totalAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'cancelled'],
            default: 'pending',
        },
        notes: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = model('Import', importSchema);
