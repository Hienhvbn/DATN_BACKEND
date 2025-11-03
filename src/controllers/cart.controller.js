const modelCart = require('../models/cart.model');
const modelProduct = require('../models/products.model');
const modelCoupon = require('../models/coupon.model.js');
const mongoose = require('mongoose');

const { AuthFailureError, BadRequestError, NotFoundError } = require('../core/error.response');
const { OK } = require('../core/success.response');

class CartController {
    async createCart(req, res) {
        const { _id } = req.user;
        const { productId, quantity } = req.body;

        if (!productId || !quantity || quantity <= 0) {
            throw new BadRequestError('Thông tin không hợp lệ');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Kiểm tra sản phẩm với lock để tránh race condition
            const product = await modelProduct.findById(productId).session(session);
            if (!product) {
                await session.abortTransaction();
                throw new NotFoundError('Product not found');
            }

            // Kiểm tra số lượng trong cart hiện tại của user
            let cart = await modelCart.findOne({ userId: _id, productId });
            const totalQuantityNeeded = (cart ? cart.quantity : 0) + quantity;

            // Kiểm tra số lượng tồn kho
            if (product.quantity < quantity) {
                await session.abortTransaction();
                throw new BadRequestError(`Không đủ số lượng. Hiện còn ${product.quantity} sản phẩm trong kho`);
            }

            // Tính giá
            const price = product.price;

            if (cart) {
                cart.quantity = totalQuantityNeeded;
                cart.totalPrice = price * cart.quantity;
                await cart.save({ session });
            } else {
                cart = await modelCart.create([{ userId: _id, productId, quantity, totalPrice: price * quantity }], {
                    session,
                });
                cart = cart[0];
            }

            // Giảm số lượng tồn kho một cách atomic
            const result = await modelProduct.findOneAndUpdate(
                { _id: productId, quantity: { $gte: quantity } }, // Chỉ update nếu số lượng đủ
                { $inc: { quantity: -quantity } },
                { new: true, session },
            );

            if (!result) {
                await session.abortTransaction();
                throw new BadRequestError('Không đủ số lượng sản phẩm. Có thể do nhiều người đang mua cùng lúc.');
            }

            await session.commitTransaction();

            new OK({
                message: 'Thêm vào giỏ hàng thành công',
                metadata: cart,
            }).send(res);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getCart(req, res) {
        const { _id } = req.user;

        const cart = await modelCart.find({ userId: _id });
        const today = new Date();
        const totalPrice = cart.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

        // tìm coupon hợp lệ
        const coupon = await modelCoupon.find({
            startDate: { $lte: today },
            endDate: { $gte: today },
            quantity: { $gt: 0 },
            minPrice: { $lte: totalPrice },
        });

        const data = await Promise.all(
            cart.map(async (item) => {
                const product = await modelProduct.findById(item.productId).populate('category', '_id name');
                return {
                    ...item.toObject(),
                    product,
                };
            }),
        );

        new OK({
            message: 'Lấy giỏ hàng thành công',
            metadata: { cart: data, coupon, totalPrice },
        }).send(res);
    }

    async updateQuantity(req, res) {
        const { _id } = req.user;
        const { productId, quantity } = req.body;

        if (!productId || quantity === undefined) {
            throw new BadRequestError('Thiếu dữ liệu bắt buộc');
        }
        if (quantity <= 0) {
            throw new BadRequestError('Số lượng phải lớn hơn 0');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const cartItem = await modelCart.findOne({ userId: _id, productId }).session(session);
            if (!cartItem) {
                await session.abortTransaction();
                throw new BadRequestError('Không tìm thấy sản phẩm trong giỏ hàng');
            }

            const product = await modelProduct.findById(productId).session(session);
            if (!product) {
                await session.abortTransaction();
                throw new NotFoundError('Sản phẩm không tồn tại');
            }

            // Tính số lượng chênh lệch
            const quantityDifference = quantity - cartItem.quantity;

            // Nếu tăng số lượng, kiểm tra tồn kho
            if (quantityDifference > 0) {
                if (product.quantity < quantityDifference) {
                    await session.abortTransaction();
                    throw new BadRequestError(`Không đủ số lượng. Hiện còn ${product.quantity} sản phẩm trong kho`);
                }

                // Giảm số lượng tồn kho
                const result = await modelProduct.findOneAndUpdate(
                    { _id: productId, quantity: { $gte: quantityDifference } },
                    { $inc: { quantity: -quantityDifference } },
                    { new: true, session },
                );

                if (!result) {
                    await session.abortTransaction();
                    throw new BadRequestError('Không đủ số lượng sản phẩm. Có thể do nhiều người đang mua cùng lúc.');
                }
            }
            // Nếu giảm số lượng, trả lại tồn kho
            else if (quantityDifference < 0) {
                await modelProduct.findOneAndUpdate(
                    { _id: productId },
                    { $inc: { quantity: Math.abs(quantityDifference) } },
                    { session },
                );
            }

            // Cập nhật giỏ hàng
            cartItem.quantity = quantity;
            const price = product.price;
            cartItem.totalPrice = price * quantity;
            await cartItem.save({ session });

            await session.commitTransaction();

            new OK({
                message: 'Cập nhật giỏ hàng thành công',
                metadata: cartItem,
            }).send(res);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async removeCartItem(req, res) {
        const { _id } = req.user;
        const { productId } = req.body;

        if (!productId) throw new BadRequestError('Thiếu productId');

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const cartItem = await modelCart.findOne({ userId: _id, productId }).session(session);
            if (!cartItem) {
                await session.abortTransaction();
                throw new NotFoundError('Không tìm thấy sản phẩm trong giỏ');
            }

            const product = await modelProduct.findById(productId).session(session);

            // Trả lại số lượng tồn kho
            if (product) {
                await modelProduct.findOneAndUpdate(
                    { _id: productId },
                    { $inc: { quantity: cartItem.quantity } },
                    { session },
                );
            }

            await cartItem.deleteOne({ session });

            await session.commitTransaction();

            new OK({
                message: 'Xóa sản phẩm khỏi giỏ thành công',
                metadata: { productId },
            }).send(res);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async updateInfoCart(req, res) {
        const { _id } = req.user;
        const { nameCoupon } = req.body;
        const cart = await modelCart.findOne({ userId: _id });
        if (!cart) {
            throw new BadRequestError('Không có sản phẩm trong giỏ hàng');
        }
        cart.nameCoupon = nameCoupon;
        await cart.save();
        new OK({
            message: 'Cập nhật thông tin giỏ hàng thành công',
            metadata: cart,
        }).send(res);
    }

    async getInfoCart(req, res) {
        const { _id } = req.user;
        const cart = await modelCart.find({ userId: _id });

        if (!cart || cart.length === 0) {
            throw new NotFoundError('Không có sản phẩm trong giỏ hàng');
        }

        let discount = 0;

        if (cart[0].nameCoupon) {
            const coupon = await modelCoupon.findOne({ nameCoupon: cart[0].nameCoupon });
            if (coupon) {
                discount = coupon.discount;
            }
        }

        const data = await Promise.all(
            cart.map(async (item) => {
                const product = await modelProduct.findById(item.productId).populate('category', '_id name');
                return {
                    ...item.toObject(),
                    product,
                };
            }),
        );

        let totalPrice = 0;

        new OK({
            message: 'Lấy thông tin giỏ hàng thành công',
            metadata: {
                cart: data,
                totalPrice: data.reduce((acc, item) => acc + (item.totalPrice || 0), 0),
                discount,
            },
        }).send(res);
    }
}

module.exports = new CartController();
