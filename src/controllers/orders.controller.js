const Cart = require('../models/cart.model.js');
const Order = require('../models/orders.model.js');
const Product = require('../models/products.model.js');
const Coupon = require('../models/coupon.model.js');
const User = require('../models/users.model.js');
const Review = require('../models/review.model.js');
const Notification = require('../models/notification.model.js');

const { BadRequestError, NotFoundError } = require('../core/error.response.js');
const { OK } = require('../core/success.response.js');

const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay');
const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

// Base URLs for production-ready redirects/callbacks
const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
const API_URL =
    process.env.BACKEND_URL || (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3002');

async function createNotification(content, userId, orderId) {
    const noti = new Notification({
        content: (content || '').trim(),
        userId: userId || null,
        orderId: orderId || '0',
    });
    await noti.save();
    return noti;
}

function generateOrderID() {
    const now = new Date();
    const timestamp = now.getTime();
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
    return `PAY${timestamp}${seconds}${milliseconds}`;
}

async function detailOrder(order) {
    const user = await User.findById(order.userId);

    // Populate product information for each item
    const itemsWithProducts = await Promise.all(
        order.items.map(async (item) => {
            const product = await Product.findById(item.productId);
            return {
                ...item.toObject(),
                product,
            };
        }),
    );

    return {
        ...order.toObject(),
        user,
        items: itemsWithProducts,
    };
}

class OrdersController {
    // ------------------- CREATE ORDER -------------------
    async createOrder(req, res) {
        const { _id } = req.user;
        const { typePayment, fullName, phoneNumber, address, email, note } = req.body;

        const carts = await Cart.find({ userId: _id });
        if (!carts || carts.length === 0) {
            throw new BadRequestError('Không có sản phẩm trong giỏ hàng');
        }
        if (!fullName || !phoneNumber || !address) {
            throw new BadRequestError('Vui lòng cập nhật thông tin đơn hàng');
        }

        // tính tổng tiền
        let totalPrice = carts.reduce((acc, item) => acc + item.totalPrice, 0);
        let discount = 0;
        if (carts[0].nameCoupon) {
            const coupon = await Coupon.findOne({ nameCoupon: carts[0].nameCoupon });
            discount = coupon?.discount || 0;
        }

        // -------- COD --------
        if (typePayment === 'cod') {
            const orderId = generateOrderID();

            // Trừ số lượng coupon nếu có
            if (carts[0].nameCoupon) {
                const coupon = await Coupon.findOne({ nameCoupon: carts[0].nameCoupon });
                if (coupon && coupon.quantity > 0) {
                    coupon.quantity -= 1;
                    await coupon.save();
                }
            }

            // Tạo items array từ cart
            const items = await Promise.all(
                carts.map(async (item) => {
                    const product = await Product.findById(item.productId);
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        totalPrice: item.totalPrice,
                    };
                }),
            );

            // Tính tổng tiền sau khi áp dụng coupon
            const finalTotal = discount > 0 ? totalPrice - (totalPrice * discount) / 100 : totalPrice;

            // Tạo một payment duy nhất cho toàn bộ đơn hàng
            const newOrder = new Order({
                orderId: orderId,
                userId: _id,
                items: items,
                totalAmount: finalTotal,
                fullName: fullName,
                phoneNumber: phoneNumber,
                address: address,
                status: 'pending',
                typePayment: typePayment.toLowerCase(),
                nameCoupon: carts[0].nameCoupon,
                note: note,
                email: email,
            });
            await newOrder.save();

            // Tạo notification cho từng sản phẩm
            for (const item of items) {
                const product = await Product.findById(item.productId);
                await createNotification(`${fullName} đã đặt hàng thành công ${product?.name || ''}`, _id, orderId);
            }

            await Cart.deleteMany({ userId: _id });

            new OK({ message: 'Create order success', metadata: newOrder }).send(res);

            // -------- Momo --------
        } else if (typePayment === 'momo') {
            const accessKey = 'F8BBA842ECF85';
            const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
            const orderInfo = `Thanh toan don hang ${carts[0]?.userId}`;
            const partnerCode = 'MOMO';
            const redirectUrl = `${API_URL}/api/orders/momo`;
            const ipnUrl = `${API_URL}/api/orders/momo`;
            const requestType = 'payWithMethod';
            let amount = discount > 0 ? totalPrice - (totalPrice * discount) / 100 : totalPrice;
            // MoMo yêu cầu amount phải là số nguyên
            amount = Math.round(amount);
            const orderId = partnerCode + new Date().getTime();
            const requestId = orderId;
            const extraData = Buffer.from(
                JSON.stringify({
                    userId: _id?.toString?.() || `${_id}`,
                    fullName,
                    phoneNumber,
                    address,
                    email,
                    note,
                }),
            ).toString('base64');

            const rawSignature =
                'accessKey=' +
                accessKey +
                '&amount=' +
                amount +
                '&extraData=' +
                extraData +
                '&ipnUrl=' +
                ipnUrl +
                '&orderId=' +
                orderId +
                '&orderInfo=' +
                orderInfo +
                '&partnerCode=' +
                partnerCode +
                '&redirectUrl=' +
                redirectUrl +
                '&requestId=' +
                requestId +
                '&requestType=' +
                requestType;

            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

            const requestBody = JSON.stringify({
                partnerCode: partnerCode,
                partnerName: 'Test',
                storeId: 'MomoTestStore',
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: redirectUrl,
                ipnUrl: ipnUrl,
                lang: 'vi',
                requestType: requestType,
                autoCapture: true,
                extraData: extraData,
                orderGroupId: '',
                signature: signature,
            });

            const options = {
                hostname: 'test-payment.momo.vn',
                port: 443,
                path: '/v2/gateway/api/create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody),
                },
            };

            const req2 = https.request(options, (res2) => {
                res2.setEncoding('utf8');
                let responseBody = '';

                res2.on('data', (chunk) => {
                    responseBody += chunk;
                });

                res2.on('end', () => {
                    try {
                        const momoResponse = JSON.parse(responseBody);

                        if (momoResponse.resultCode === 0) {
                            new OK({
                                message: 'Create order success',
                                metadata: momoResponse,
                            }).send(res);
                        } else {
                            console.error('MoMo Error:', momoResponse);
                            new OK({
                                message: momoResponse.message || 'MoMo order failed',
                                metadata: momoResponse,
                            }).send(res);
                        }
                    } catch (error) {
                        console.error('Error parsing MoMo response:', error);
                        throw new BadRequestError('Invalid MoMo order');
                    }
                });
            });

            req2.on('error', (e) => {
                throw new BadRequestError(`problem with request: ${e.message}`);
            });
            req2.write(requestBody);
            req2.end();

            // -------- VNPay --------
        } else if (typePayment === 'vnpay') {
            const vnpay = new VNPay({
                tmnCode: 'DH2F13SW',
                secureSecret: '7VJPG70RGPOWFO47VSBT29WPDYND0EJG',
                vnpayHost: 'https://sandbox.vnpayment.vn',
                testMode: true,
                hashAlgorithm: 'SHA512',
                loggerFn: ignoreLogger,
            });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Tính amount cho VNPay
            let vnpayAmount = discount > 0 ? totalPrice - (totalPrice * discount) / 100 : totalPrice;
            vnpayAmount = Math.round(vnpayAmount);

            const vnpayResponse = await vnpay.buildPaymentUrl({
                vnp_Amount: vnpayAmount,
                vnp_IpAddr: '127.0.0.1',
                vnp_TxnRef: `${_id}_${generateOrderID()}`,
                vnp_OrderInfo: Buffer.from(
                    JSON.stringify({
                        userId: _id?.toString?.() || `${_id}`,
                        fullName,
                        phoneNumber,
                        address,
                        email,
                        note,
                    }),
                ).toString('base64'),
                vnp_OrderType: ProductCode.Other,
                vnp_ReturnUrl: `${API_URL}/api/orders/vnpay`,
                vnp_Locale: VnpLocale.VN,
                vnp_CreateDate: dateFormat(new Date()),
                vnp_ExpireDate: dateFormat(tomorrow),
            });

            new OK({ message: 'Thanh toán VNPay', metadata: vnpayResponse }).send(res);
        }
    }

    // ------------------- CALLBACK MOMO ORDER -------------------
    async momoCallback(req, res) {
        const { resultCode, extraData } = req.query;
        let decoded = {};
        try {
            decoded = extraData ? JSON.parse(Buffer.from(extraData, 'base64').toString('utf8')) : {};
        } catch (e) {
            decoded = {};
        }
        const _id = decoded.userId;

        if (resultCode === '0') {
            const carts = await Cart.find({ userId: _id });
            const orderId = generateOrderID();

            // Trừ số lượng coupon nếu có
            if (carts[0]?.nameCoupon) {
                const coupon = await Coupon.findOne({ nameCoupon: carts[0].nameCoupon });
                if (coupon && coupon.quantity > 0) {
                    coupon.quantity -= 1;
                    await coupon.save();
                }
            }

            // Tạo items array từ cart
            const items = await Promise.all(
                carts.map(async (item) => {
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        totalPrice: item.totalPrice,
                    };
                }),
            );

            // Tính tổng tiền sau khi áp dụng coupon
            const totalPrice = carts.reduce((sum, item) => sum + item.totalPrice, 0);

            // Lấy thông tin coupon để tính discount
            let discount = 0;
            if (carts[0]?.nameCoupon) {
                const coupon = await Coupon.findOne({ nameCoupon: carts[0].nameCoupon });
                if (coupon) {
                    discount = coupon.discount || 0;
                }
            }

            const finalTotal = discount > 0 ? totalPrice - (totalPrice * discount) / 100 : totalPrice;

            // Tạo một payment duy nhất cho toàn bộ đơn hàng
            const newOrder = new Order({
                orderId: orderId,
                userId: _id,
                items: items,
                totalAmount: finalTotal,
                fullName: decoded.fullName || 'Khách hàng',
                phoneNumber: decoded.phoneNumber || '',
                address: decoded.address || '',
                status: 'pending',
                typePayment: 'momo',
                nameCoupon: carts[0].nameCoupon,
                note: decoded.note || '',
                email: decoded.email || '',
            });
            await newOrder.save();

            // Tạo notification cho từng sản phẩm
            for (const item of items) {
                const product = await Product.findById(item.productId);
                await createNotification(
                    `${decoded.fullName || 'Khách hàng'} đã đặt hàng thành công ${product?.name || ''} qua MoMo`,
                    _id,
                    orderId,
                );
            }

            await Cart.deleteMany({ userId: _id });
            res.redirect(`${CLIENT_URL}/payment-success/${orderId}`);
        } else {
            // Thanh toán thất bại - tạo order trạng thái failed để hiển thị trên FE
            try {
                let decoded = extraData ? JSON.parse(Buffer.from(extraData, 'base64').toString('utf8')) : {};
                const _id = decoded.userId;
                if (_id) {
                    const carts = await Cart.find({ userId: _id });
                    const orderId = generateOrderID();

                    const items = await Promise.all(
                        carts.map(async (item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            totalPrice: item.totalPrice,
                        })),
                    );

                    const totalPrice = carts.reduce((sum, item) => sum + item.totalPrice, 0);
                    let discount = 0;
                    if (carts[0]?.nameCoupon) {
                        const coupon = await Coupon.findOne({ nameCoupon: carts[0].nameCoupon });
                        if (coupon) discount = coupon.discount || 0;
                    }
                    const finalTotal = discount > 0 ? totalPrice - (totalPrice * discount) / 100 : totalPrice;

                    const failedOrder = new Order({
                        orderId,
                        userId: _id,
                        items,
                        totalAmount: finalTotal,
                        fullName: decoded.fullName || 'Khách hàng',
                        phoneNumber: decoded.phoneNumber || '',
                        address: decoded.address || '',
                        status: 'failed',
                        typePayment: 'momo',
                        nameCoupon: carts[0]?.nameCoupon,
                        note: decoded.note || '',
                        email: decoded.email || '',
                    });
                    await failedOrder.save();
                    return res.redirect(`${CLIENT_URL}/payment-failed/${orderId}`);
                }
            } catch (_) {
                // ignore
            }
            // res.redirect('http://localhost:5173/payment-failed');
        }
    }

    // ------------------- CALLBACK VNPAY ORDER -------------------
    async vnpayCallback(req, res) {
        const { vnp_ResponseCode, vnp_OrderInfo } = req.query;
        if (vnp_ResponseCode === '00') {
            let decoded = {};
            try {
                decoded = vnp_OrderInfo ? JSON.parse(Buffer.from(vnp_OrderInfo, 'base64').toString('utf8')) : {};
            } catch (e) {
                decoded = {};
            }
            const _id = decoded.userId;
            const orderId = generateOrderID();
            const carts = await Cart.find({ userId: _id });

            // Trừ số lượng coupon nếu có
            if (carts[0]?.nameCoupon) {
                const coupon = await Coupon.findOne({ nameCoupon: carts[0].nameCoupon });
                if (coupon && coupon.quantity > 0) {
                    coupon.quantity -= 1;
                    await coupon.save();
                }
            }

            // Tạo items array từ cart
            const items = await Promise.all(
                carts.map(async (item) => {
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        totalPrice: item.totalPrice,
                    };
                }),
            );

            // Tính tổng tiền sau khi áp dụng coupon
            const totalPrice = carts.reduce((sum, item) => sum + item.totalPrice, 0);

            // Lấy thông tin coupon để tính discount
            let discount = 0;
            if (carts[0]?.nameCoupon) {
                const coupon = await Coupon.findOne({ nameCoupon: carts[0].nameCoupon });
                if (coupon) {
                    discount = coupon.discount || 0;
                }
            }

            const finalTotal = discount > 0 ? totalPrice - (totalPrice * discount) / 100 : totalPrice;

            // Tạo một payment duy nhất cho toàn bộ đơn hàng
            const newOrder = new Order({
                orderId: orderId,
                userId: _id,
                items: items,
                totalAmount: finalTotal,
                fullName: decoded.fullName || 'Khách hàng',
                phoneNumber: decoded.phoneNumber || '',
                address: decoded.address || '',
                status: 'pending',
                typePayment: 'vnpay',
                nameCoupon: carts[0].nameCoupon,
                note: decoded.note || '',
                email: decoded.email || '',
            });
            await newOrder.save();

            // Tạo notification cho từng sản phẩm
            for (const item of items) {
                const product = await Product.findById(item.productId);
                await createNotification(
                    `${decoded.fullName || 'Khách hàng'} đã đặt hàng thành công ${product?.name || ''} qua VNPay`,
                    _id,
                    orderId,
                );
            }

            await Cart.deleteMany({ userId: _id });
            res.redirect(`${CLIENT_URL}/payment-success/${orderId}`);
        } else {
            // Thanh toán thất bại - tạo order trạng thái failed để hiển thị trên FE
            try {
                let decoded = {};
                try {
                    decoded = vnp_OrderInfo ? JSON.parse(Buffer.from(vnp_OrderInfo, 'base64').toString('utf8')) : {};
                } catch (_) {
                    decoded = {};
                }
                const _id = decoded.userId;
                if (_id) {
                    const carts = await Cart.find({ userId: _id });
                    const orderId = generateOrderID();

                    const items = await Promise.all(
                        carts.map(async (item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            totalPrice: item.totalPrice,
                        })),
                    );

                    const totalPrice = carts.reduce((sum, item) => sum + item.totalPrice, 0);
                    let discount = 0;
                    if (carts[0]?.nameCoupon) {
                        const coupon = await Coupon.findOne({ nameCoupon: carts[0].nameCoupon });
                        if (coupon) discount = coupon.discount || 0;
                    }
                    const finalTotal = discount > 0 ? totalPrice - (totalPrice * discount) / 100 : totalPrice;

                    const failedOrder = new Order({
                        orderId,
                        userId: _id,
                        items,
                        totalAmount: finalTotal,
                        fullName: decoded.fullName || 'Khách hàng',
                        phoneNumber: decoded.phoneNumber || '',
                        address: decoded.address || '',
                        status: 'failed',
                        typePayment: 'vnpay',
                        nameCoupon: carts[0]?.nameCoupon,
                        note: decoded.note || '',
                        email: decoded.email || '',
                    });
                    await failedOrder.save();
                    return res.redirect(`${CLIENT_URL}/payment-failed/${orderId}`);
                }
            } catch (_) {
                // ignore
            }
            // res.redirect('http://localhost:5173/payment-failed');
        }
    }

    // ------------------- GET ORDER BY ID -------------------
    async getOrderById(req, res) {
        // Accept both query (?id=) and param (/order/:id), and both orderId or _id
        const idParam = req.query.id || req.params?.id;
        if (!idParam) {
            throw new BadRequestError('Missing order id');
        }

        // Try find by orderId first, then by Mongo _id
        let order = await Order.findOne({ orderId: idParam });
        if (!order) {
            try {
                order = await Order.findById(idParam);
            } catch (_) {
                // ignore invalid ObjectId cast
            }
        }
        if (!order) throw new NotFoundError('Order not found');

        // Populate product information for each item
        const itemsWithProducts = await Promise.all(
            order.items.map(async (item) => {
                const product = await Product.findById(item.productId);
                return {
                    ...item.toObject(),
                    product,
                };
            }),
        );

        let coupon = null;
        if (order.nameCoupon) {
            coupon = await Coupon.findOne({ nameCoupon: order.nameCoupon });
        }

        const data = {
            ...order.toObject(),
            items: itemsWithProducts,
            coupon,
        };

        new OK({ message: 'Get order by id success', metadata: data }).send(res);
    }

    // ------------------- GET ORDERS BY USER -------------------
    async getOrdersByUserId(req, res) {
        const { _id } = req.user;
        const orders = await Order.find({ userId: _id });

        const data = await Promise.all(
            orders.map(async (order) => {
                // Populate product information for each item
                const itemsWithProducts = await Promise.all(
                    order.items.map(async (item) => {
                        const product = await Product.findById(item.productId);
                        const review = await Review.findOne({ productId: item.productId, userId: _id });
                        return {
                            ...item.toObject(),
                            product,
                            review,
                        };
                    }),
                );

                let coupon = null;
                if (order.nameCoupon) {
                    coupon = await Coupon.findOne({ nameCoupon: order.nameCoupon });
                }

                return {
                    ...order.toObject(),
                    items: itemsWithProducts,
                    coupon,
                };
            }),
        );

        new OK({ message: 'Get orders by user id success', metadata: data }).send(res);
    }

    // ------------------- CANCEL ORDER -------------------
    async cancelOrder(req, res) {
        const { orderId } = req.body;
        const order = await Order.findOne({ orderId: orderId });
        if (!order) throw new NotFoundError('Order not found');

        order.status = 'failed';
        await order.save();

        new OK({ message: 'Cancel order success' }).send(res);
    }

    // ------------------- GET ALL ORDERS -------------------
    async getAllOrders(req, res) {
        const orders = await Order.find({});
        const data = await Promise.all(
            orders.map(async (order) => {
                return await detailOrder(order);
            }),
        );
        new OK({ message: 'Get all orders success', metadata: data }).send(res);
    }

    // ------------------- UPDATE ORDER STATUS -------------------
    async updateOrderStatus(req, res) {
        const { idOrder, status } = req.body;
        const order = await Order.findOne({ orderId: idOrder });
        if (!order) throw new NotFoundError('Order not found');

        order.status = status;
        await order.save();

        let content = '';
        switch (status) {
            case 'confirm':
                content = `${order.fullName} đã xác nhận đơn hàng ${order.orderId}`;
                break;
            case 'shipping':
                content = `${order.fullName} đã bắt đầu vận chuyển ${order.orderId}`;
                break;
            case 'success':
                content = `${order.fullName} đã giao hàng thành công ${order.orderId}`;
                break;
            case 'failed':
                content = `${order.fullName} đã bị huỷ ${order.orderId}`;
                break;
            case 'pending':
                content = `${order.fullName} đã đặt hàng thành công ${order.orderId}`;
                break;
        }

        await createNotification(content, order.userId, order.orderId);

        new OK({ message: 'Update status success' }).send(res);
    }
}

module.exports = new OrdersController();
