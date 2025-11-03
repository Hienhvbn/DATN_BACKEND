const { AuthFailureError } = require('../core/error.response.js');
const { verifyToken } = require('../services/tokenServices.js');
const modelUser = require('../models/users.model');

const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

const authUser = async (req, res, next) => {
    try {
        const user = req.cookies.token;
        if (!user) throw new AuthFailureError('Ban khong co quyen truy cap');
        const token = user;
        const decoded = await verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.log(error);
        next(error);
    }
};

const authAdmin = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            // Luôn trả về JSON error cho API calls
            throw new AuthFailureError('Token không tồn tại. Vui lòng đăng nhập lại.');
        }

        const decoded = await verifyToken(token);
        const { _id } = decoded;

        const findUser = await modelUser.findById(_id);
        if (!findUser) {
            throw new AuthFailureError('Người dùng không tồn tại');
        }

        if (findUser.role !== 'admin') {
            throw new AuthFailureError('Bạn không có quyền truy cập trang admin');
        }

        req.user = decoded;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { authUser, asyncHandler, authAdmin };
