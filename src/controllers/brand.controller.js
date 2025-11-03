const fs = require('fs');
const modelBrand = require('../models/brand.model.js');
const Product = require('../models/products.model.js'); // nếu có Product
const { BadRequestError, NotFoundError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response.js');
const { cloudinary, deleteCloudinaryImage } = require('../config/cloudinary');

const cleanupTempFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error cleaning up temporary file:', error);
    }
};

class BrandController {
    async uploadImage(req, res) {
        try {
            const file = req.file; // vì 1 ảnh nên dùng req.file thay vì req.files
            if (!file) {
                throw new BadRequestError('Vui lòng upload ảnh');
            }

            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'soundhouse/brands',
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
    // [POST] /api/brands
    async createBrand(req, res) {
        try {
            const { name, website, image } = req.body;
            if (!name || name.trim() === '') {
                throw new BadRequestError('Vui lòng nhập tên thương hiệu');
            }

            // check duplicate
            const existing = await modelBrand.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
            });
            if (existing) {
                throw new BadRequestError('Thương hiệu đã tồn tại');
            }

            let imageUrl = '';
            // Xử lý ảnh từ URL (từ frontend) hoặc từ file upload
            if (image && image.trim() !== '') {
                // Nếu có URL ảnh từ frontend
                imageUrl = image;
            } else if (req.file) {
                // Nếu có file upload trực tiếp
                const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'soundhouse/brands',
                    resource_type: 'image',
                });
                imageUrl = uploadResult.secure_url;
                cleanupTempFile(req.file.path);
            }

            const brand = await modelBrand.create({
                name,
                image: imageUrl,
                website: website || '',
            });

            new OK({
                message: 'Tạo thương hiệu thành công',
                metadata: brand,
            }).send(res);
        } catch (error) {
            console.error('createBrand error:', error);
            throw error;
        }
    }

    // [PUT] /api/brands
    async updateBrand(req, res) {
        try {
            const { _id, name, website, image } = req.body;
            if (!_id) {
                throw new BadRequestError('Thiếu ID thương hiệu');
            }
            if (!name || name.trim() === '') {
                throw new BadRequestError('Vui lòng nhập tên thương hiệu');
            }

            const brand = await modelBrand.findById(_id);
            if (!brand) {
                throw new NotFoundError('Thương hiệu không tồn tại');
            }

            brand.name = name;
            brand.website = website;

            // Xử lý ảnh từ URL (từ frontend) hoặc từ file upload
            if (image && image.trim() !== '') {
                // Nếu có URL ảnh mới từ frontend
                if (brand.image && brand.image !== image) {
                    // Xóa ảnh cũ nếu có và khác ảnh mới
                    await deleteCloudinaryImage(brand.image);
                }
                brand.image = image;
            } else if (req.file) {
                // Nếu có file upload trực tiếp
                if (brand.image) {
                    await deleteCloudinaryImage(brand.image);
                }
                const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'soundhouse/brands',
                    resource_type: 'image',
                });
                brand.image = uploadResult.secure_url;
                cleanupTempFile(req.file.path);
            }

            await brand.save();

            new OK({
                message: 'Cập nhật thương hiệu thành công',
                metadata: brand,
            }).send(res);
        } catch (error) {
            console.error('updatebrand error:', error);
            throw error;
        }
    }

    async getBrands(req, res) {
        try {
            const brands = await modelBrand.find({});
            const data = await Promise.all(
                brands.map(async (brand) => {
                    const products = await Product.find({
                        brand: brand._id,
                    });
                    return {
                        ...brand.toObject(),
                        products,
                    };
                }),
            );

            new OK({
                message: 'Lấy thương hiệu thành công',
                metadata: data,
            }).send(res);
        } catch (error) {
            console.error('getBrands error:', error);
            throw error;
        }
    }

    // [DELETE] /api/brands
    async deleteBrand(req, res) {
        try {
            const { _id } = req.body;
            if (!_id) {
                throw new BadRequestError('Thiếu ID thương hiệu');
            }

            const brand = await modelBrand.findByIdAndDelete(_id);
            if (!brand) {
                throw new NotFoundError('Thương hiệu không tồn tại');
            }

            if (brand.image) {
                await deleteCloudinaryImage(brand.image);
            }

            new OK({
                message: 'Xóa thương hiệu thành công',
                metadata: brand,
            }).send(res);
        } catch (error) {
            console.error('deleteBrand error:', error);
            throw error;
        }
    }
}

module.exports = new BrandController();
