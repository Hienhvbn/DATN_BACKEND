const Blog = require('../models/blog.model');
const { BadRequestError, NotFoundError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');
const { cloudinary, deleteCloudinaryImage } = require('../config/cloudinary');
const fs = require('fs');

const cleanupTempFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error cleaning up temporary file:', error);
    }
};

class BlogController {
    // 📤 Upload ảnh
    async uploadImage(req, res) {
        try {
            const file = req.file; // vì 1 ảnh nên dùng req.file thay vì req.files
            if (!file) {
                throw new BadRequestError('Vui lòng upload ảnh');
            }

            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'soundhouse/blogs',
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

    // 📝 Tạo bài viết
    async createBlog(req, res, next) {
        try {
            const { title, content, image } = req.body;
            if (!title || !content) {
                throw new BadRequestError('Thiếu tiêu đề hoặc nội dung');
            }
            let imageUrl = image || '';
            if (req.file) {
                const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'soundhouse/blogs',
                    resource_type: 'image',
                });
                imageUrl = uploadResult.secure_url;
                cleanupTempFile(req.file.path);
            }
            const blog = await Blog.create({ title, content, image: imageUrl });

            new Created({
                message: 'Tạo bài viết thành công',
                metadata: blog,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // 📚 Lấy tất cả bài viết
    async getAllBlog(req, res, next) {
        try {
            const blogs = await Blog.find().sort({ createdAt: -1 });
            new OK({
                message: 'Lấy tất cả bài viết thành công',
                metadata: blogs,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // ✏️ Cập nhật bài viết
    async updateBlog(req, res, next) {
        try {
            const { _id, title, content, image } = req.body;

            const blog = await Blog.findById(_id);
            if (!blog) {
                throw new NotFoundError('Bài viết không tồn tại');
            }

            blog.title = title || blog.title;
            blog.content = content || blog.content;

            // Cập nhật ảnh từ body nếu có
            if (image) {
                blog.image = image;
            }

            if (req.file) {
                if (blog.image) {
                    await deleteCloudinaryImage(blog.image);
                }
                const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'soundhouse/blogs',
                    resource_type: 'image',
                });
                blog.image = uploadResult.secure_url;
                cleanupTempFile(req.file.path);
            }

            await blog.save();

            new OK({
                message: 'Cập nhật bài viết thành công',
                metadata: blog,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // ❌ Xóa bài viết
    async deleteBlog(req, res, next) {
        try {
            const { _id } = req.body;
            const blog = await Blog.findById(_id);
            if (!blog) {
                throw new NotFoundError('Bài viết không tồn tại');
            }

            await Blog.findByIdAndDelete(_id);

            new OK({
                message: 'Xóa bài viết thành công',
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    // 🔍 Lấy chi tiết bài viết theo ID
    async getBlogById(req, res, next) {
        try {
            const { id } = req.query;
            const blog = await Blog.findById(id);
            if (!blog) {
                throw new NotFoundError('Bài viết không tồn tại');
            }

            new OK({
                message: 'Lấy bài viết thành công',
                metadata: blog,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new BlogController();
