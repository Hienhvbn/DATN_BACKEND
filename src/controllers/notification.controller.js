const Notification = require('../models/notification.model');
const { OK } = require('../core/success.response');

class NotificationController {
    // 📩 Lấy tất cả thông báo có paymentId = "0"
    async getNotification(req, res) {
        try {
            const notifications = await Notification.find({ paymentId: '0' }).lean();

            new OK({
                message: 'Lấy thông báo thành công',
                metadata: notifications,
            }).send(res);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi lấy thông báo' });
        }
    }

    // 🔔 Lấy thông báo theo userId (người dùng hiện tại)
    async getNotificationByUserId(req, res) {
        try {
            const { _id } = req.user || {};
            if (!_id) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const notifications = await Notification.find({ userId: _id }).sort({ createdAt: -1 }).lean();

            new OK({
                message: 'Lấy thông báo thành công',
                metadata: notifications,
            }).send(res);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi lấy thông báo người dùng' });
        }
    }

    // ✅ Đánh dấu tất cả thông báo đã đọc
    async readAllNotification(req, res) {
        try {
            const { _id } = req.user;

            await Notification.updateMany({ userId: _id }, { $set: { isRead: true } });

            new OK({
                message: 'Đánh dấu thông báo đã đọc thành công',
            }).send(res);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái thông báo' });
        }
    }
}

module.exports = new NotificationController();
