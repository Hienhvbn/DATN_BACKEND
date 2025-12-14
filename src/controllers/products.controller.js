const fs = require('fs');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');

const modelProduct = require('../models/products.model.js');
const modelReview = require('../models/review.model.js');
const modelUser = require('../models/users.model.js');
const modelOrder = require('../models/orders.model.js');

const { BadRequestError, NotFoundError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response');

// Helper xóa file tạm
const cleanupTempFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error cleaning temp file:', error);
    }
};

class ProductController {
    // Upload hình ảnh lên Cloudinary
    async uploadsImage(req, res) {
        const files = req.files;
        if (!files || files.length === 0) {
            throw new BadRequestError('Vui lòng upload ảnh');
        }

        const images = await Promise.all(
            files.map(async (file) => {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: 'soundhouse/products',
                        resource_type: 'image',
                    });
                    cleanupTempFile(file.path);
                    return { url: result.secure_url };
                } catch (error) {
                    cleanupTempFile(file.path);
                    throw error;
                }
            }),
        );

        new Created({ message: 'Upload ảnh thành công', metadata: images }).send(res);
    }

    // Tạo sản phẩm mới
    async createProduct(req, res) {
        const { name, price, description, category, brand, specs, quantity, images, costPrice } = req.body;

        if (!name || !price || !description || !category || !brand) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(category)) {
            throw new BadRequestError('Danh mục không hợp lệ');
        }

        if (!mongoose.Types.ObjectId.isValid(brand)) {
            throw new BadRequestError('Thương hiệu không hợp lệ');
        }

        let imagesUrl = [];

        // Xử lý ảnh từ URL (từ frontend) hoặc từ file upload
        if (images && Array.isArray(images) && images.length > 0) {
            // Nếu có URL ảnh từ frontend
            imagesUrl = images;
        } else if (req.files && req.files.length > 0) {
            // Nếu có file upload trực tiếp
            imagesUrl = await Promise.all(
                req.files.map(async (file) => {
                    try {
                        const result = await cloudinary.uploader.upload(file.path, {
                            folder: 'soundhouse/products',
                            resource_type: 'image',
                        });
                        cleanupTempFile(file.path);
                        return result.secure_url;
                    } catch (error) {
                        cleanupTempFile(file.path);
                        throw error;
                    }
                }),
            );
        }

        // Nếu không có ảnh, sử dụng ảnh mặc định
        if (imagesUrl.length === 0) {
            imagesUrl = ['https://via.placeholder.com/300x300'];
        }

        const product = await modelProduct.create({
            name,
            price,
            description,
            category,
            brand,
            specs: specs || {},
            images: imagesUrl,
            quantity: quantity || stock || 0,
            costPrice: costPrice || 0,
        });

        new Created({ message: 'Tạo sản phẩm thành công', metadata: product }).send(res);
    }

    // Lấy sản phẩm theo ID
    async getProductById(req, res) {
        const { id } = req.query;
        const product = await modelProduct.findById(id).populate('category', 'name _id');
        if (!product) {
            throw new NotFoundError('Sản phẩm không tồn tại');
        }

        const productRelate = await modelProduct.find({ category: product.category }).sort({ createdAt: -1 }).limit(8);

        const review = await modelReview.find({ productId: id });

        const dataReview = await Promise.all(
            review.map(async (item) => {
                const user = await modelUser.findById(item.userId);
                return { ...item.toObject(), user };
            }),
        );

        new OK({
            message: 'Lấy sản phẩm thành công',
            metadata: { product, productRelate, review: dataReview },
        }).send(res);
    }

    // Tìm kiếm sản phẩm
    async searchProduct(req, res) {
        const { q } = req.query;

        const products = await modelProduct.find({
            name: { $regex: q, $options: 'i' },
        });

        new OK({ message: 'Tìm kiếm sản phẩm thành công', metadata: products }).send(res);
    }

    // Cập nhật sản phẩm
    async updateProduct(req, res) {
        const { _id, name, price, description, category, brand, specs, quantity, images, costPrice } = req.body;

        const product = await modelProduct.findById(_id);
        if (!product) {
            throw new NotFoundError('Sản phẩm không tồn tại');
        }

        let imagesUrl = product.images || [];

        // Xử lý ảnh từ URL (từ frontend) hoặc từ file upload
        if (images && Array.isArray(images) && images.length > 0) {
            // Nếu có URL ảnh từ frontend
            imagesUrl = images;
        } else if (req.files && req.files.length > 0) {
            // Nếu có file upload trực tiếp
            const newImages = await Promise.all(
                req.files.map(async (file) => {
                    try {
                        const result = await cloudinary.uploader.upload(file.path, {
                            folder: 'soundhouse/products',
                            resource_type: 'image',
                        });
                        cleanupTempFile(file.path);
                        return result.secure_url;
                    } catch (error) {
                        cleanupTempFile(file.path);
                        throw error;
                    }
                }),
            );
            imagesUrl = [...imagesUrl, ...newImages]; // giữ ảnh cũ + thêm ảnh mới
        }

        Object.assign(product, {
            name,
            price,
            description,
            category,
            brand,
            specs,
            quantity: quantity !== undefined ? quantity : stock !== undefined ? stock : product.quantity,
            images: imagesUrl,
            costPrice: costPrice !== undefined ? costPrice : product.costPrice,
        });

        await product.save();

        new OK({ message: 'Cập nhật sản phẩm thành công', metadata: product }).send(res);
    }

    // Lấy tất cả sản phẩm
    async getAllProducts(req, res) {
        const products = await modelProduct.find().populate('brand', 'name _id image').populate('category', 'name _id');
        new OK({ message: 'Lấy tất cả sản phẩm thành công', metadata: products }).send(res);
    }

    // Lấy top 10 sản phẩm mới nhất
    async getTopNewProducts(req, res) {
        const products = await modelProduct
            .find()
            .sort({ createdAt: 1 })
            .limit(4)
            .populate('brand', 'name _id image')
            .populate('category', 'name _id');
        new OK({
            message: 'Lấy top 4 sản phẩm mới nhất thành công',
            metadata: products,
        }).send(res);
    }

    // Xóa sản phẩm
    async deleteProduct(req, res) {
        const { _id } = req.body;
        const product = await modelProduct.findByIdAndDelete(_id);
        if (!product) {
            throw new NotFoundError('Sản phẩm không tồn tại');
        }
        new OK({ message: 'Xóa sản phẩm thành công', metadata: product }).send(res);
    }

    // Lấy top 10 sản phẩm mua nhiều nhất
    async getTopBestSellingProducts(req, res) {
        // Aggregate để tính tổng số lượng đã bán của mỗi sản phẩm (chỉ lấy đơn hàng thành công)
        const topProductsAgg = await modelOrder.aggregate([
            { $match: { status: 'success' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    totalQuantity: { $sum: '$items.quantity' },
                },
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
        ]);

        // Lấy thông tin chi tiết của các sản phẩm
        const products = await Promise.all(
            topProductsAgg.map(async (item) => {
                const product = await modelProduct
                    .findById(item._id)
                    .populate('category', 'name _id')
                    .populate('brand', 'name _id image');

                if (product) {
                    return {
                        ...product.toObject(),
                        totalSold: item.totalQuantity,
                    };
                }
                return null;
            }),
        );

        // Lọc bỏ các sản phẩm null và chỉ lấy sản phẩm còn hàng, giới hạn top 10
        const filteredProducts = products
            .filter((p) => p !== null)
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 10);
        new OK({
            message: 'Lấy top 10 sản phẩm mua nhiều nhất thành công',
            metadata: filteredProducts,
        }).send(res);
    }

    // Lấy sản phẩm theo Category
    async getProductByCategory(req, res) {
        const { id } = req.query;
        const products = await modelProduct.find({ category: id });
        new OK({ message: 'Lấy sản phẩm thành công', metadata: products }).send(res);
    }

    // ========== STOCK MANAGEMENT METHODS ==========

    // Cập nhật tồn kho sản phẩm
    async updateProductStock(req, res) {
        const { id } = req.params;
        const { quantity, costPrice, reason, notes } = req.body;

        if (quantity < 0) {
            throw new BadRequestError('Số lượng không được âm');
        }

        const product = await modelProduct.findById(id);
        if (!product) {
            throw new NotFoundError('Không tìm thấy sản phẩm');
        }

        // Cập nhật thông tin tồn kho
        const updateData = {
            quantity: quantity,
            lastImportDate: new Date(),
            lastImportQuantity: quantity - product.quantity,
        };

        if (costPrice !== undefined) {
            updateData.costPrice = costPrice;
        }

        const updatedProduct = await modelProduct.findByIdAndUpdate(id, updateData, { new: true });

        new OK({
            message: 'Cập nhật tồn kho thành công',
            metadata: {
                product: updatedProduct,
                stockChange: updateData.lastImportQuantity,
                reason,
                notes,
            },
        }).send(res);
    }

    // Tăng tồn kho (nhập hàng)
    async increaseStock(req, res) {
        const { id } = req.params;
        const { quantity, costPrice, reason, notes } = req.body;

        if (quantity <= 0) {
            throw new BadRequestError('Số lượng phải lớn hơn 0');
        }

        const product = await modelProduct.findById(id);
        if (!product) {
            throw new NotFoundError('Không tìm thấy sản phẩm');
        }

        const newQuantity = product.quantity + quantity;
        const updateData = {
            quantity: newQuantity,
            lastImportDate: new Date(),
            lastImportQuantity: quantity,
        };

        if (costPrice !== undefined) {
            updateData.costPrice = costPrice;
        }

        const updatedProduct = await modelProduct.findByIdAndUpdate(id, updateData, { new: true });

        new OK({
            message: 'Tăng tồn kho thành công',
            metadata: {
                product: updatedProduct,
                stockAdded: quantity,
                reason,
                notes,
            },
        }).send(res);
    }

    // Giảm tồn kho (bán hàng)
    async decreaseStock(req, res) {
        const { id } = req.params;
        const { quantity, reason, notes } = req.body;

        if (quantity <= 0) {
            throw new BadRequestError('Số lượng phải lớn hơn 0');
        }

        const product = await modelProduct.findById(id);
        if (!product) {
            throw new NotFoundError('Không tìm thấy sản phẩm');
        }

        if (product.quantity < quantity) {
            throw new BadRequestError('Tồn kho không đủ');
        }

        const newQuantity = product.quantity - quantity;
        const updateData = {
            quantity: newQuantity,
        };

        const updatedProduct = await modelProduct.findByIdAndUpdate(id, updateData, { new: true });

        new OK({
            message: 'Giảm tồn kho thành công',
            metadata: {
                product: updatedProduct,
                stockReduced: quantity,
                reason,
                notes,
            },
        }).send(res);
    }

    // Lấy danh sách sản phẩm hết hàng
    async getOutOfStockProducts(req, res) {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const products = await modelProduct
            .find({ stockStatus: 'out_of_stock' })
            .populate('category', 'name')
            .populate('brand', 'name')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await modelProduct.countDocuments({ stockStatus: 'out_of_stock' });

        new OK({
            message: 'Lấy danh sách sản phẩm hết hàng thành công',
            metadata: {
                products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        }).send(res);
    }

    // Lấy danh sách sản phẩm sắp hết hàng
    async getLowStockProducts(req, res) {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const products = await modelProduct
            .find({ stockStatus: 'low_stock' })
            .populate('category', 'name')
            .populate('brand', 'name')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await modelProduct.countDocuments({ stockStatus: 'low_stock' });

        new OK({
            message: 'Lấy danh sách sản phẩm sắp hết hàng thành công',
            metadata: {
                products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        }).send(res);
    }

    // Lấy thống kê tồn kho
    async getStockStats(req, res) {
        const stats = await modelProduct.aggregate([
            {
                $group: {
                    _id: '$stockStatus',
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
                },
            },
        ]);

        const totalProducts = await modelProduct.countDocuments();
        const totalStockValue = await modelProduct.aggregate([
            { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$costPrice'] } } } },
        ]);

        new OK({
            message: 'Lấy thống kê tồn kho thành công',
            metadata: {
                stats,
                totalProducts,
                totalStockValue: totalStockValue[0]?.total || 0,
            },
        }).send(res);
    }

    // Cập nhật cài đặt tồn kho tối thiểu
    async updateMinQuantity(req, res) {
        const { id } = req.params;
        const { minQuantity, maxQuantity } = req.body;

        if (minQuantity < 0) {
            throw new BadRequestError('Số lượng tối thiểu không được âm');
        }

        if (maxQuantity && maxQuantity < minQuantity) {
            throw new BadRequestError('Số lượng tối đa phải lớn hơn số lượng tối thiểu');
        }

        const product = await modelProduct.findById(id);
        if (!product) {
            throw new NotFoundError('Không tìm thấy sản phẩm');
        }

        const updateData = { minQuantity };
        if (maxQuantity !== undefined) {
            updateData.maxQuantity = maxQuantity;
        }

        const updatedProduct = await modelProduct.findByIdAndUpdate(id, updateData, { new: true });

        new OK({
            message: 'Cập nhật cài đặt tồn kho thành công',
            metadata: updatedProduct,
        }).send(res);
    }
}

module.exports = new ProductController();
