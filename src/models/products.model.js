const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        images: {
            type: [String],
            required: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'category',
            required: true,
        },
        brand: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'brand',
            required: true,
        },
        quantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        minQuantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxQuantity: {
            type: Number,
            default: 1000,
            min: 0,
        },
        costPrice: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastImportDate: {
            type: Date,
        },
        lastImportQuantity: {
            type: Number,
            default: 0,
        },
        stockStatus: {
            type: String,
            enum: ['in_stock', 'low_stock', 'out_of_stock'],
            default: 'out_of_stock',
        },
        specs: {
            type: Object,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

// Middleware to update stockStatus before saving
productSchema.pre('save', function (next) {
    if (this.quantity <= 0) {
        this.stockStatus = 'out_of_stock';
    } else if (this.quantity <= this.minQuantity) {
        this.stockStatus = 'low_stock';
    } else {
        this.stockStatus = 'in_stock';
    }
    next();
});

const Product = mongoose.model('product', productSchema);
module.exports = Product;
