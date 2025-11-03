const fs = require('fs');
const modelCategory = require('../models/category.model.js');
// const Product = require("../models/product.model.js"); // nếu có Product
const { BadRequestError, NotFoundError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response.js');
const { cloudinary, deleteCloudinaryImage } = require('../config/cloudinary');
const Product = require('../models/products.model.js');

const cleanupTempFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error cleaning up temporary file:', error);
    }
};

class CategoryController {
    async uploadImage(req, res) {
        try {
            const file = req.file; // vì 1 ảnh nên dùng req.file thay vì req.files
            if (!file) {
                throw new BadRequestError('Vui lòng upload ảnh');
            }

            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'soundhouse/categories',
                resource_type: 'image',
            });

            // dọn file tạm sau khi upload
            cleanupTempFile(file.path);

            new Created({
                message: 'Upload ảnh thành công',
                metadata: { url: result.secure_url },
            }).send(res);
        } catch (error) {
            if (req.file) cleanupTempFile(req.file.path);
            throw error;
        }
    }

    // [POST] /api/categories
    async createCategory(req, res) {
        try {
            const { name, image } = req.body;
            if (!name || name.trim() === '') {
                throw new BadRequestError('Vui lòng nhập tên danh mục');
            }

            // check duplicate
            const existing = await modelCategory.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
            });
            if (existing) {
                throw new BadRequestError('Danh mục đã tồn tại');
            }

            let imageUrl = '';
            // Xử lý ảnh từ URL (từ frontend) hoặc từ file upload
            if (image && image.trim() !== '') {
                // Nếu có URL ảnh từ frontend
                imageUrl = image;
            } else if (req.file) {
                // Nếu có file upload trực tiếp
                const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'soundhouse/categories',
                    resource_type: 'image',
                });
                imageUrl = uploadResult.secure_url;
                cleanupTempFile(req.file.path);
            }

            const category = await modelCategory.create({
                name,
                image: imageUrl,
            });

            new OK({
                message: 'Tạo danh mục thành công',
                metadata: category,
            }).send(res);
        } catch (error) {
            console.error('createCategory error:', error);
            throw error;
        }
    }

    // [GET] /api/categories
    async getCategories(req, res) {
        try {
            const categories = await modelCategory.find({});
            const data = await Promise.all(
                categories.map(async (category) => {
                    const products = await Product.find({
                        category: category._id,
                    });
                    return {
                        ...category.toObject(),
                        products,
                    };
                }),
            );

            new OK({
                message: 'Lấy danh mục thành công',
                metadata: data,
            }).send(res);
        } catch (error) {
            console.error('getCategories error:', error);
            throw error;
        }
    }

    // [GET] /api/category/get?id=...
    async getCategoryById(req, res) {
        try {
            const { id } = req.query;

            if (!id) {
                throw new BadRequestError('Thiếu ID danh mục');
            }

            const category = await modelCategory.findById(id);

            if (!category) {
                throw new NotFoundError('Không tìm thấy danh mục');
            }

            // Lấy số lượng sản phẩm trong danh mục
            const productCount = await Product.countDocuments({ category: id });

            new OK({
                message: 'Lấy thông tin danh mục thành công',
                metadata: {
                    ...category.toObject(),
                    productCount,
                },
            }).send(res);
        } catch (error) {
            console.error('getCategoryById error:', error);
            throw error;
        }
    }

    // [PUT] /api/categories
    async updateCategory(req, res) {
        try {
            const { _id, name, image } = req.body;
            if (!_id) {
                throw new BadRequestError('Thiếu ID danh mục');
            }
            if (!name || name.trim() === '') {
                throw new BadRequestError('Vui lòng nhập tên danh mục');
            }

            const category = await modelCategory.findById(_id);
            if (!category) {
                throw new NotFoundError('Danh mục không tồn tại');
            }

            category.name = name;

            // Xử lý ảnh từ URL (từ frontend) hoặc từ file upload
            if (image && image.trim() !== '') {
                // Nếu có URL ảnh mới từ frontend
                if (category.image && category.image !== image) {
                    // Xóa ảnh cũ nếu có và khác ảnh mới
                    await deleteCloudinaryImage(category.image);
                }
                category.image = image;
            } else if (req.file) {
                // Nếu có file upload trực tiếp
                if (category.image) {
                    await deleteCloudinaryImage(category.image);
                }
                const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'soundhouse/categories',
                    resource_type: 'image',
                });
                category.image = uploadResult.secure_url;
                cleanupTempFile(req.file.path);
            }

            await category.save();

            new OK({
                message: 'Cập nhật danh mục thành công',
                metadata: category,
            }).send(res);
        } catch (error) {
            console.error('updateCategory error:', error);
            throw error;
        }
    }

    // [DELETE] /api/categories
    async deleteCategory(req, res) {
        try {
            const { _id } = req.body;
            if (!_id) {
                throw new BadRequestError('Thiếu ID danh mục');
            }

            const category = await modelCategory.findByIdAndDelete(_id);
            if (!category) {
                throw new NotFoundError('Danh mục không tồn tại');
            }

            if (category.image) {
                await deleteCloudinaryImage(category.image);
            }

            new OK({
                message: 'Xóa danh mục thành công',
                metadata: category,
            }).send(res);
        } catch (error) {
            console.error('deleteCategory error:', error);
            throw error;
        }
    }
}

module.exports = new CategoryController();
