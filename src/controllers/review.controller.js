const modelReview = require('../models/review.model');
const { OK, Created } = require('../core/success.response');
const modelProduct = require('../models/products.model');
const modelUser = require('../models/users.model');
const mongoose = require('mongoose');
class controllerReview {
    async createReview(req, res) {
        const { content, rating, productId } = req.body;
        const { _id } = req.user;

        const review = await modelReview.create({
            userId: _id,
            productId,
            content,
            rating,
        });

        new Created({
            message: 'Tạo đánh giá sản phẩm thành công',
            statusCode: 201,
            metadata: review,
        }).send(res);
    }

    async getReview(req, res) {
        const reviews = await modelReview
            .find({})
            .sort({ createdAt: -1 }) // DESC
            .limit(10)
            .lean(); // trả về plain object thay vì Mongoose document

        const data = await Promise.all(
            reviews.map(async (item) => {
                const user = await modelUser.findById(item.userId).lean();
                const product = await modelProduct.findById(item.productId).lean();

                return {
                    ...item,
                    user: user ? { name: user.fullName } : null,
                    product: product
                        ? {
                              name: product.name,
                              image: Array.isArray(product.images) ? product.images[0] : product.images?.split(',')[0],
                          }
                        : null,
                };
            }),
        );

        new OK({
            message: 'Lấy danh sách đánh giá sản phẩm thành công',
            statusCode: 200,
            metadata: data,
        }).send(res);
    }

    async getReviewByProductId(req, res) {
        const { productId } = req.query;

        if (!productId) {
            return res.status(400).json({
                message: 'Thiếu productId',
                statusCode: 400,
            });
        }

        try {
            // Lấy tất cả reviews của sản phẩm
            // Thử query với cả string và ObjectId
            let reviews = await modelReview
                .find({ productId: productId })
                .populate('userId', 'fullName avatar')
                .sort({ createdAt: -1 })
                .lean();

            // Nếu không tìm thấy với string, thử với ObjectId
            if (reviews.length === 0 && mongoose.Types.ObjectId.isValid(productId)) {
                reviews = await modelReview
                    .find({ productId: new mongoose.Types.ObjectId(productId) })
                    .populate('userId', 'fullName avatar')
                    .sort({ createdAt: -1 })
                    .lean();
            }

            // Tính toán rating trung bình và số lượng reviews
            const totalReviews = reviews.length;
            const averageRating =
                totalReviews > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0;

            new OK({
                message: 'Lấy đánh giá sản phẩm thành công',
                statusCode: 200,
                metadata: {
                    reviews,
                    totalReviews,
                    averageRating: Math.round(averageRating * 10) / 10, // Làm tròn 1 chữ số thập phân
                },
            }).send(res);
        } catch (error) {
            console.error('Error getting product reviews:', error);
            res.status(500).json({
                message: 'Lỗi server khi lấy đánh giá sản phẩm',
                statusCode: 500,
            });
        }
    }

    async getAllReview(req, res) {
        try {
            const allReviews = await modelReview.find({}).lean();

            new OK({
                message: 'Lấy tất cả đánh giá thành công',
                statusCode: 200,
                metadata: {
                    totalReviews: allReviews.length,
                    reviews: allReviews,
                },
            }).send(res);
        } catch (error) {
            console.error('Error getting all reviews:', error);
            res.status(500).json({
                message: 'Lỗi server khi lấy tất cả đánh giá',
                statusCode: 500,
            });
        }
    }
}
module.exports = new controllerReview();
