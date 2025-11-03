const userRoutes = require('./users.routes.js');
const categoryRoutes = require('./category.routes.js');
const brandsRoutes = require('./brand.routes.js');
const productRoutes = require('./products.routes.js');
const reviewRoutes = require('./review.routes.js');
const couponRoutes = require('./coupon.routes.js');
const cartRoutes = require('./cart.routes.js');
const ordersRoutes = require('./orders.routes.js');
const notificationRoutes = require('./notification.routes.js');
const blogRoutes = require('./blog.routes.js');
const supplierRoutes = require('./supplier.routes.js');
const importRoutes = require('./import.routes.js');

function routes(app) {
    app.use('/api/user', userRoutes);
    app.use('/api/category', categoryRoutes);
    app.use('/api/brand', brandsRoutes);
    app.use('/api/product', productRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/coupon', couponRoutes);
    app.use('/api/orders', ordersRoutes);
    app.use('/api/review', reviewRoutes);
    app.use('/api/notification', notificationRoutes);
    app.use('/api/blog', blogRoutes);
    app.use('/api/supplier', supplierRoutes);
    app.use('/api/import', importRoutes);
}

module.exports = routes;
