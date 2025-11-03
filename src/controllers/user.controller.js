const modelUser = require('../models/users.model.js');
const modelApiKey = require('../models/apiKey.model.js');
const { connect } = require('../config/db.js');
const { cloudinary, deleteCloudinaryImage } = require('../config/cloudinary');
const { AuthFailureError, BadRequestError } = require('../core/error.response.js');
const { OK } = require('../core/success.response.js');
const { createApiKey, createRefreshToken, createToken, verifyToken } = require('../services/tokenServices');

const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');
const { jwtDecode } = require('jwt-decode');
const jwt = require('jsonwebtoken');
const fs = require('fs');

require('dotenv').config();

// Helper xóa file tạm
const cleanupTempFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Temporary file cleaned up:', filePath);
        }
    } catch (error) {
        console.error('Error cleaning up temporary file:', error);
    }
};

class controllerUser {
    async registerUser(req, res) {
        const { fullName, phone, address, email, password, birthDay } = req.body;
        if (!fullName || !phone || !email || !password) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }
        const findUser = await modelUser.findOne({ email });

        if (findUser) {
            throw new BadRequestError('Email đã tồn tại');
        }

        const saltRounds = 10;
        const salt = bcrypt.genSaltSync(saltRounds);
        const passwordHash = bcrypt.hashSync(password, salt);
        const dataUser = new modelUser({
            fullName,
            phone,
            address,
            email,
            password: passwordHash,
            typeLogin: 'email',
            birthDay,
        });

        await dataUser.save();
        await createApiKey(dataUser._id);
        const token = await createToken({
            _id: dataUser._id,
            isAdmin: dataUser.isAdmin,
            address: dataUser.address,
            phone: dataUser.phone,
        });
        const refreshToken = await createRefreshToken({ _id: dataUser._id });
        res.cookie('token', token, {
            httpOnly: true, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 15 * 60 * 1000, // 15 phút
        });

        res.cookie('logged', 1, {
            httpOnly: false, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        });

        // Đặt cookie HTTP-Only cho refreshToken (tùy chọn)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        });

        new OK({ message: 'Đăng nhập thành công', metadata: { token, refreshToken } }).send(res);
    }

    async loginUser(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }
        const findUser = await modelUser.findOne({ email });
        if (!findUser) {
            throw new AuthFailureError('Tài khoản hoặc mật khẩu không chính xác');
        }
        const isPasswordValid = bcrypt.compareSync(password, findUser.password);
        if (!isPasswordValid) {
            throw new AuthFailureError('Tài khoản hoặc mật khẩu không chính xác');
        }
        await createApiKey(findUser._id);
        const token = await createToken({ _id: findUser._id, isAdmin: findUser.isAdmin });
        const refreshToken = await createRefreshToken({ _id: findUser._id });
        res.cookie('token', token, {
            httpOnly: true, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 15 * 60 * 1000, // 15 phút
        });
        res.cookie('logged', 1, {
            httpOnly: false, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        });
        new OK({ message: 'Đăng nhập thành công', metadata: { token, refreshToken } }).send(res);
    }

    async loginAdmin(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }
        const findUser = await modelUser.findOne({ email });
        if (!findUser) {
            throw new AuthFailureError('Tài khoản hoặc mật khẩu không chính xác');
        }
        const isPasswordValid = bcrypt.compareSync(password, findUser.password);
        if (!isPasswordValid) {
            throw new AuthFailureError('Tài khoản hoặc mật khẩu không chính xác');
        }
        if (findUser.role != 'admin') throw new AuthFailureError('Tài khoản không có quyền truy cập');
        await createApiKey(findUser._id);
        const token = await createToken({ _id: findUser._id, role: findUser.role });
        const refreshToken = await createRefreshToken({ _id: findUser._id });
        res.cookie('token', token, {
            httpOnly: true, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 15 * 60 * 1000, // 15 phút
        });
        res.cookie('logged', 1, {
            httpOnly: false, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        });
        new OK({ message: 'Đăng nhập thành công', metadata: { token, refreshToken } }).send(res);
    }

    async authUser(req, res) {
        const { _id } = req.user;

        const findUser = await modelUser.findOne({ _id });

        if (!findUser) {
            throw new AuthFailureError('Tài khoản không tồn tại');
        }

        const auth = CryptoJS.AES.encrypt(JSON.stringify(findUser), process.env.SECRET_CRYPTO).toString();

        new OK({ message: 'success', metadata: auth }).send(res);
    }

    async refreshToken(req, res) {
        const refreshToken = req.cookies.refreshToken;

        const decoded = await verifyToken(refreshToken);

        const user = await modelUser.findOne({ _id: decoded._id });
        const token = await createToken({ _id: user._id });
        res.cookie('token', token, {
            httpOnly: true, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 15 * 60 * 1000, // 15 phút
        });

        res.cookie('logged', 1, {
            httpOnly: false, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        });

        new OK({ message: 'Refresh token thành công', metadata: { token } }).send(res);
    }

    async logout(req, res) {
        try {
            const { _id } = req.user;

            // Xóa API key của user
            await modelApiKey.deleteOne({ userId: _id });

            // Xóa cookie chứa token
            res.clearCookie('token', { httpOnly: true, sameSite: 'Strict', secure: true });
            res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict', secure: true });
            res.clearCookie('logged', { sameSite: 'Strict', secure: true });

            new OK({ message: 'Đăng xuất thành công' }).send(res);
        } catch (error) {
            console.error('Error during logout:', error);
            new BadRequestError('Có lỗi khi đăng xuất').send(res);
        }
    }

    async logoutAdmin(req, res) {
        try {
            const { _id } = req.user;

            // Xóa API key của admin
            await modelApiKey.deleteOne({ userId: _id });

            // Xóa cookie chứa token
            res.clearCookie('token', { httpOnly: true, sameSite: 'Strict', secure: true });
            res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict', secure: true });
            res.clearCookie('logged', { sameSite: 'Strict', secure: true });

            new OK({ message: 'Admin đăng xuất thành công' }).send(res);
        } catch (error) {
            console.error('Error during admin logout:', error);
            new BadRequestError('Có lỗi khi đăng xuất admin').send(res);
        }
    }

    async checkAdminAuth(req, res) {
        try {
            new OK({
                message: 'Admin authenticated successfully',
                metadata: { user: req.user },
            }).send(res);
        } catch (error) {
            console.error('Error checking admin auth:', error);
            new BadRequestError('Có lỗi khi kiểm tra quyền admin').send(res);
        }
    }

    async updateInfoUser(req, res, next) {
        try {
            const { _id } = req.user;
            const { fullName, address, phone, birthDay } = req.body;

            const user = await modelUser.findById(_id);
            if (!user) {
                throw new BadRequestError('Không tìm thấy tài khoản');
            }

            let image = user.avatar; // Giữ avatar cũ mặc định
            if (req.file) {
                // Nếu có upload ảnh mới
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'soundhouse/users',
                });
                image = result.secure_url;
                cleanupTempFile(req.file.path);
            }

            user.fullName = fullName || user.fullName;
            user.address = address || user.address;
            user.phone = phone || user.phone;
            user.birthDay = birthDay || user.birthDay;
            user.avatar = image;

            await user.save();

            new OK({
                message: 'Cập nhật thông tin tài khoản thành công',
                metadata: user,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    async loginGoogle(req, res) {
        const { credential } = req.body;
        const dataToken = jwtDecode(credential);
        const user = await modelUser.findOne({ email: dataToken.email });
        if (user) {
            await createApiKey(user._id);
            const token = await createToken({ _id: user._id });
            const refreshToken = await createRefreshToken({ _id: user._id });
            res.cookie('token', token, {
                httpOnly: true, // Chặn truy cập từ JavaScript (bảo mật hơn)
                secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
                sameSite: 'Strict', // Chống tấn công CSRF
                maxAge: 15 * 60 * 1000, // 15 phút
            });
            res.cookie('logged', 1, {
                httpOnly: false, // Chặn truy cập từ JavaScript (bảo mật hơn)
                secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
                sameSite: 'Strict', // ChONGL tấn công CSRF
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'Strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });
            new OK({ message: 'Đăng nhập thành công', metadata: { token, refreshToken } }).send(res);
        } else {
            const newUser = await modelUser.create({
                fullName: dataToken.name,
                email: dataToken.email,
                typeLogin: 'google',
            });
            await newUser.save();
            await createApiKey(newUser._id);
            const token = await createToken({ _id: newUser._id });
            const refreshToken = await createRefreshToken({ _id: newUser._id });
            res.cookie('token', token, {
                httpOnly: true, // Chặn truy cập từ JavaScript (bảo mật hơn)
                secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
                sameSite: 'Strict', // ChONGL tấn công CSRF
                maxAge: 15 * 60 * 1000, // 15 phút
            });
            res.cookie('logged', 1, {
                httpOnly: false, // Chặn truy cập từ JavaScript (bảo mật hơn)
                secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
                sameSite: 'Strict', // ChONGL tấn công CSRF
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'Strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });
            new OK({ message: 'Đăng nhập thành công', metadata: { token, refreshToken } }).send(res);
        }
    }

    async getUsers(req, res) {
        try {
            const { page = 1, limit = 10, search = '', role = '' } = req.query;

            // Build query
            let query = {};

            // Search by name, email, or phone
            if (search) {
                query.$or = [
                    { fullName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                ];
            }

            // Filter by role
            if (role) {
                query.role = role;
            }

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Get users with pagination
            const users = await modelUser
                .find(query)
                .select('-password') // Exclude password from response
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            // Get total count
            const total = await modelUser.countDocuments(query);

            new OK({
                message: 'Lấy danh sách người dùng thành công',
                metadata: {
                    users,
                    pagination: {
                        current: parseInt(page),
                        pageSize: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit)),
                    },
                },
            }).send(res);
        } catch (error) {
            console.error('Error getting users:', error);
            throw new BadRequestError('Không thể lấy danh sách người dùng');
        }
    }

    async updateUser(req, res) {
        const { userId, fullName, phone, email, role } = req.body;

        // Validation
        if (!userId) {
            throw new BadRequestError('Thiếu userId');
        }
        if (!fullName || !phone || !email || !role) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }

        // Check if user exists
        const user = await modelUser.findById(userId);
        if (!user) {
            throw new BadRequestError('Người dùng không tồn tại');
        }

        // Check if email is already taken by another user
        const existingUser = await modelUser.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
            throw new BadRequestError('Email đã được sử dụng bởi người dùng khác');
        }

        // Update user
        user.fullName = fullName;
        user.phone = phone;
        user.email = email;
        user.role = role;
        await user.save();

        new OK({ message: 'Cập nhật người dùng thành công' }).send(res);
    }

    async changeAvatar(req, res) {
        const { file } = req;
        const { _id } = req.user;

        if (!file) {
            throw new BadRequestError('Vui lòng chọn file ảnh');
        }

        const user = await modelUser.findOne({ _id });
        if (!user) {
            throw new BadRequestError('Người dùng không tồn tại');
        }

        try {
            // Xóa avatar cũ nếu có
            if (user.avatar) {
                try {
                    await cloudinary.uploader.destroy(user.avatar);
                } catch (error) {
                    console.log('Không thể xóa avatar cũ:', error.message);
                }
            }

            // Upload avatar mới
            const uploadResult = await cloudinary.uploader.upload(file.path, {
                folder: 'soundhouse/avatars',
                resource_type: 'image',
                transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }, { quality: 'auto' }],
            });

            // Cập nhật avatar trong database
            user.avatar = uploadResult.secure_url;
            await user.save();

            // Cleanup file tạm
            cleanupTempFile(file.path);

            new OK({
                message: 'Cập nhật avatar thành công',
                metadata: {
                    avatar: uploadResult.secure_url,
                    user: {
                        _id: user._id,
                        fullName: user.fullName,
                        email: user.email,
                        avatar: user.avatar,
                    },
                },
            }).send(res);
        } catch (error) {
            cleanupTempFile(file.path);
            console.error('Avatar upload error:', error);
            throw new BadRequestError('Cập nhật avatar thất bại: ' + error.message);
        }
    }

    async deleteUser(req, res) {
        const { userId } = req.body;
        const user = await modelUser.findById(userId);
        if (!user) {
            throw new BadRequestError('Người dùng không tồn tại');
        }
        await modelUser.findByIdAndDelete(userId);
        new OK({ message: 'Xóa người dùng thành công' }).send(res);
    }

    async createUser(req, res) {
        const { fullName, phone, email, password, role } = req.body;

        // Validation
        if (!fullName || !phone || !email || !password || !role) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new BadRequestError('Email không hợp lệ');
        }

        // Phone validation
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            throw new BadRequestError('Số điện thoại phải có 10 chữ số');
        }

        // Password validation
        if (password.length < 6) {
            throw new BadRequestError('Mật khẩu phải có ít nhất 6 ký tự');
        }

        // Role validation
        if (!['admin', 'user'].includes(role)) {
            throw new BadRequestError('Role không hợp lệ');
        }

        // Check if email already exists
        const findUser = await modelUser.findOne({ email });
        if (findUser) {
            throw new BadRequestError('Email đã tồn tại');
        }

        // Hash password
        const saltRounds = 10;
        const salt = bcrypt.genSaltSync(saltRounds);
        const passwordHash = bcrypt.hashSync(password, salt);

        // Create user
        const dataUser = await modelUser.create({
            fullName,
            phone,
            email,
            password: passwordHash,
            typeLogin: 'email',
            role,
        });

        new OK({ message: 'Tạo người dùng thành công' }).send(res);
    }

    async getStatistic(req, res) {
        try {
            const modelOrders = require('../models/orders.model.js');
            const modelProducts = require('../models/products.model');
            const currentDate = new Date();
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const firstDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const lastDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

            // 1. Thống kê tổng quan
            const totalCustomers = await modelUser.countDocuments();
            const totalOrders = await modelOrders.countDocuments();
            const totalRevenueAgg = await modelOrders.aggregate([
                { $match: { status: 'success' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]);
            const totalRevenue = totalRevenueAgg[0]?.total || 0;
            const totalProducts = await modelProducts.countDocuments();

            // 2. Thống kê theo tháng
            const customersThisMonth = await modelUser.countDocuments({ createdAt: { $gte: firstDayOfMonth } });
            const customersLastMonth = await modelUser.countDocuments({
                createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
            });

            const ordersThisMonth = await modelOrders.countDocuments({ createdAt: { $gte: firstDayOfMonth } });
            const ordersLastMonth = await modelOrders.countDocuments({
                createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
            });

            const revenueThisMonthAgg = await modelOrders.aggregate([
                { $match: { status: 'success', createdAt: { $gte: firstDayOfMonth } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]);
            const revenueThisMonth = revenueThisMonthAgg[0]?.total || 0;

            const revenueLastMonthAgg = await modelOrders.aggregate([
                { $match: { status: 'success', createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]);
            const revenueLastMonth = revenueLastMonthAgg[0]?.total || 0;

            const productsThisMonth = await modelProducts.countDocuments({ createdAt: { $gte: firstDayOfMonth } });
            const productsLastMonth = await modelProducts.countDocuments({
                createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
            });

            const customerGrowth =
                customersLastMonth === 0 ? 100 : ((customersThisMonth - customersLastMonth) / customersLastMonth) * 100;
            const orderGrowth =
                ordersLastMonth === 0 ? 100 : ((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100;
            const revenueGrowth =
                revenueLastMonth === 0 ? 100 : ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
            const productGrowth =
                productsLastMonth === 0 ? 100 : ((productsThisMonth - productsLastMonth) / productsLastMonth) * 100;

            // 3. Thống kê doanh thu theo tháng (lợi nhuận = doanh thu - tổng giá nhập)
            const monthlyStats = await Promise.all(
                Array.from({ length: 12 }, async (_, index) => {
                    const month = index;
                    const startDate = new Date(currentDate.getFullYear(), month, 1);
                    const endDate = new Date(currentDate.getFullYear(), month + 1, 0, 23, 59, 59, 999);

                    // Tổng doanh thu theo tháng (đơn hàng thành công)
                    const revenueAgg = await modelOrders.aggregate([
                        {
                            $match: {
                                status: 'success',
                                createdAt: { $gte: startDate, $lte: endDate },
                            },
                        },
                        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
                    ]);
                    const revenue = revenueAgg[0]?.totalRevenue || 0;

                    // Tổng giá nhập theo tháng dựa trên costPrice của sản phẩm
                    const costAgg = await modelOrders.aggregate([
                        {
                            $match: {
                                status: 'success',
                                createdAt: { $gte: startDate, $lte: endDate },
                            },
                        },
                        { $unwind: '$items' },
                        {
                            $lookup: {
                                from: 'products',
                                localField: 'items.productId',
                                foreignField: '_id',
                                as: 'product',
                            },
                        },
                        { $unwind: '$product' },
                        {
                            $group: {
                                _id: null,
                                totalCost: { $sum: { $multiply: ['$items.quantity', '$product.costPrice'] } },
                            },
                        },
                    ]);
                    const totalCost = costAgg[0]?.totalCost || 0;
                    const profit = Math.max(0, revenue - totalCost);

                    const orders = await modelOrders.countDocuments({
                        status: 'success',
                        createdAt: { $gte: startDate, $lte: endDate },
                    });

                    return {
                        month: `T${month + 1}`,
                        revenue: revenue / 1000000,
                        profit: profit / 1000000,
                        orders,
                    };
                }),
            );

            // 4. Top sản phẩm bán chạy
            const topProductsAgg = await modelOrders.aggregate([
                { $match: { status: 'success' } },
                { $unwind: '$items' },
                { $group: { _id: '$items.productId', totalQuantity: { $sum: '$items.quantity' } } },
                { $sort: { totalQuantity: -1 } },
                { $limit: 4 },
            ]);

            // Lấy tên sản phẩm
            const topProducts = await Promise.all(
                topProductsAgg.map(async (p) => {
                    const product = await modelProducts.findById(p._id);
                    return {
                        name: product?.name || 'Unknown',
                        value: p.totalQuantity,
                    };
                }),
            );

            // 5. Đơn hàng gần đây
            const recentOrdersRaw = await modelOrders
                .find()
                .sort({ createdAt: -1 })
                .limit(4)
                .populate('items.productId', 'name');

            const recentOrders = recentOrdersRaw.map((order) => ({
                id: order._id,
                customer: order.fullName,
                product:
                    order.items.length > 1
                        ? `${order.items[0]?.productId?.name} + ${order.items.length - 1} sản phẩm khác`
                        : order.items[0]?.productId?.name || 'Không có sản phẩm',
                totalPrice: order.totalAmount,
                status:
                    order.status === 'success'
                        ? 'Hoàn thành'
                        : order.status === 'shipping'
                        ? 'Đang giao'
                        : order.status === 'confirm'
                        ? 'Đang xử lý'
                        : 'Chờ xử lý',
                avatar: order.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase(),
            }));

            new OK({
                message: 'Lấy thống kê thành công',
                metadata: {
                    stats: {
                        customers: {
                            count: totalCustomers,
                            growth: parseFloat(customerGrowth.toFixed(2)),
                            isPositive: customerGrowth > 0,
                        },
                        orders: {
                            count: totalOrders,
                            growth: parseFloat(orderGrowth.toFixed(2)),
                            isPositive: orderGrowth > 0,
                        },
                        revenue: {
                            count: totalRevenue,
                            growth: parseFloat(revenueGrowth.toFixed(2)),
                            isPositive: revenueGrowth > 0,
                        },
                        products: {
                            count: totalProducts,
                            growth: parseFloat(productGrowth.toFixed(2)),
                            isPositive: productGrowth > 0,
                        },
                    },
                    monthlyData: monthlyStats,
                    topProducts,
                    recentOrders,
                },
            }).send(res);
        } catch (error) {
            console.error('Error in getStatistic:', error);
            throw new BadRequestError('Có lỗi xảy ra khi lấy thống kê');
        }
    }

    // Favorites functions
    async addToFavorites(req, res) {
        try {
            const { productId } = req.body;
            const userId = req.user._id;

            if (!productId) {
                throw new BadRequestError('Product ID is required');
            }

            // Check if product exists
            const modelProduct = require('../models/products.model.js');
            const product = await modelProduct.findById(productId);
            if (!product) {
                throw new BadRequestError('Product not found');
            }

            // Check if already in favorites
            const user = await modelUser.findById(userId);
            if (user.favorites.includes(productId)) {
                throw new BadRequestError('Product already in favorites');
            }

            // Add to favorites
            await modelUser.findByIdAndUpdate(userId, {
                $push: { favorites: productId },
            });

            new OK({
                message: 'Added to favorites successfully',
                metadata: { productId },
            }).send(res);
        } catch (error) {
            console.error('Error adding to favorites:', error);
            throw error;
        }
    }

    async removeFromFavorites(req, res) {
        try {
            const { productId } = req.params;
            const userId = req.user._id;

            if (!productId) {
                throw new BadRequestError('Product ID is required');
            }

            // Remove from favorites
            await modelUser.findByIdAndUpdate(userId, {
                $pull: { favorites: productId },
            });

            new OK({
                message: 'Removed from favorites successfully',
                metadata: { productId },
            }).send(res);
        } catch (error) {
            console.error('Error removing from favorites:', error);
            throw error;
        }
    }

    async getFavorites(req, res) {
        try {
            const userId = req.user._id;

            const user = await modelUser.findById(userId).populate('favorites');

            const favorites = user.favorites.map((product) => ({
                product,
                addedAt: new Date().toISOString(), // You might want to store actual added date
            }));

            new OK({
                message: 'Get favorites successfully',
                metadata: favorites,
            }).send(res);
        } catch (error) {
            console.error('Error getting favorites:', error);
            throw error;
        }
    }
}

module.exports = new controllerUser();
