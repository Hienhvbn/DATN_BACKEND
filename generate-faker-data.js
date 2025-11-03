const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/users.model');
const Category = require('./src/models/category.model');
const Brand = require('./src/models/brand.model');
const Product = require('./src/models/products.model');
const Supplier = require('./src/models/supplier.model');
const Blog = require('./src/models/blog.model');
const Coupon = require('./src/models/coupon.model');
const Import = require('./src/models/import.model');
const ImportDetail = require('./src/models/importDetail.model');
const Cart = require('./src/models/cart.model');
const Order = require('./src/models/orders.model');
const Notification = require('./src/models/notification.model');

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/datn';
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB successfully!');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Generate fake users
const generateUsers = async (count = 50) => {
    console.log('👥 Generating users...');
    const users = [];

    for (let i = 0; i < count; i++) {
        const user = {
            fullName: faker.person.fullName(),
            phone: faker.phone.number('0#########'),
            address: faker.location.streetAddress({ useFullAddress: true }),
            birthDay: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
            email: faker.internet.email(),
            password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
            role: faker.helpers.arrayElement(['admin', 'user']),
            typeLogin: faker.helpers.arrayElement(['google', 'email']),
            isOnline: faker.helpers.arrayElement(['online', 'offline']),
            favorites: [],
        };
        users.push(user);
    }

    const savedUsers = await User.insertMany(users);
    console.log(`✅ Generated ${count} users`);
    return savedUsers; // Return saved users with _id
};

// Generate fake categories
const generateCategories = async () => {
    console.log('📂 Generating categories...');
    const categories = [
        { name: 'Loa Karaoke', image: 'https://via.placeholder.com/300x200?text=Loa+Karaoke' },
        { name: 'Loa Nghe Nhạc', image: 'https://via.placeholder.com/300x200?text=Loa+Nghe+Nhạc' },
        { name: 'Loa Bluetooth', image: 'https://via.placeholder.com/300x200?text=Loa+Bluetooth' },
        { name: 'Loa Vi Tính', image: 'https://via.placeholder.com/300x200?text=Loa+Vi+Tính' },
        { name: 'Đài Cassette', image: 'https://via.placeholder.com/300x200?text=Đài+Cassette' },
    ];

    const savedCategories = await Category.insertMany(categories);
    console.log(`✅ Generated ${categories.length} categories`);
    return savedCategories; // Return saved categories with _id
};

// Generate fake brands
const generateBrands = async () => {
    console.log('🏷️ Generating brands...');
    const brands = [
        { name: 'JBL', image: 'https://via.placeholder.com/200x100?text=JBL', website: 'https://jbl.com' },
        { name: 'Sony', image: 'https://via.placeholder.com/200x100?text=Sony', website: 'https://sony.com' },
        { name: 'Bose', image: 'https://via.placeholder.com/200x100?text=Bose', website: 'https://bose.com' },
        {
            name: 'Harman Kardon',
            image: 'https://via.placeholder.com/200x100?text=Harman+Kardon',
            website: 'https://harmankardon.com',
        },
        {
            name: 'Marshall',
            image: 'https://via.placeholder.com/200x100?text=Marshall',
            website: 'https://marshall.com',
        },
        {
            name: 'Audio-Technica',
            image: 'https://via.placeholder.com/200x100?text=Audio-Technica',
            website: 'https://audio-technica.com',
        },
        {
            name: 'Sennheiser',
            image: 'https://via.placeholder.com/200x100?text=Sennheiser',
            website: 'https://sennheiser.com',
        },
        { name: 'Klipsch', image: 'https://via.placeholder.com/200x100?text=Klipsch', website: 'https://klipsch.com' },
        {
            name: 'Bang & Olufsen',
            image: 'https://via.placeholder.com/200x100?text=Bang+Olufsen',
            website: 'https://bang-olufsen.com',
        },
        { name: 'KEF', image: 'https://via.placeholder.com/200x100?text=KEF', website: 'https://kef.com' },
    ];

    const savedBrands = await Brand.insertMany(brands);
    console.log(`✅ Generated ${brands.length} brands`);
    return savedBrands; // Return saved brands with _id
};

// Generate fake suppliers
const generateSuppliers = async (users) => {
    console.log('🏢 Generating suppliers...');
    const suppliers = [];
    const adminUsers = users.filter((user) => user.role === 'admin');

    // Ensure we have at least one admin user
    if (adminUsers.length === 0) {
        console.log('⚠️ No admin users found, creating one...');
        const adminUser = await User.create({
            fullName: 'Admin User',
            email: 'admin@example.com',
            password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            role: 'admin',
            typeLogin: 'email',
            phone: '0123456789',
            address: 'Admin Address',
        });
        adminUsers.push(adminUser);
        console.log('✅ Created admin user:', adminUser._id);
    }

    console.log('Admin users available:', adminUsers.length);

    if (adminUsers.length === 0) {
        throw new Error('No admin users available for creating suppliers');
    }

    // Get the first admin user's ID
    const adminUserId = adminUsers[0]._id;
    console.log('Using admin user ID:', adminUserId);

    for (let i = 0; i < 20; i++) {
        const supplier = {
            name: faker.company.name(),
            address: faker.location.streetAddress({ useFullAddress: true }),
            phone: faker.phone.number('0#########'),
            email: faker.internet.email(),
            taxCode: faker.string.alphanumeric(10).toUpperCase(),
            status: faker.helpers.arrayElement(['active', 'inactive']),
            description: faker.lorem.paragraph(),
            createdBy: adminUserId,
        };
        suppliers.push(supplier);
    }

    const savedSuppliers = await Supplier.insertMany(suppliers);
    console.log(`✅ Generated ${suppliers.length} suppliers`);
    return savedSuppliers; // Return saved suppliers with _id
};

// Generate fake products
const generateProducts = async (categories, brands) => {
    console.log('📱 Generating products...');
    const products = [];

    // Nguồn ảnh loa đài (Unsplash Source - ảnh ngẫu nhiên theo từ khóa)
    const speakerImageQueries = [
        'speaker',
        'bluetooth%20speaker',
        'karaoke%20speaker',
        'home%20audio%20speaker',
        'studio%20monitor',
        'audio%20equipment',
        'sound%20system',
        'hi-fi%20speaker',
        'portable%20speaker',
        'subwoofer',
    ];

    const getSpeakerImageUrl = (w = 400, h = 400) =>
        `https://source.unsplash.com/featured/${w}x${h}?${faker.helpers.arrayElement(speakerImageQueries)}`;

    // Tên sản phẩm theo từng danh mục
    const productNamesByCategory = {
        'Loa Karaoke': [
            'Loa Karaoke JBL PartyBox',
            'Loa Karaoke Sony SRS-XB',
            'Loa Karaoke Bose SoundLink',
            'Loa Karaoke Harman Kardon',
            'Loa Karaoke Marshall Acton',
            'Loa Karaoke Audio-Technica',
            'Loa Karaoke Sennheiser',
            'Loa Karaoke Klipsch',
            'Loa Karaoke Bang & Olufsen',
            'Loa Karaoke KEF',
            'Loa Karaoke Pioneer',
            'Loa Karaoke Yamaha',
            'Loa Karaoke Denon',
            'Loa Karaoke Onkyo',
            'Loa Karaoke Marantz',
        ],
        'Loa Nghe Nhạc': [
            'Loa Nghe Nhạc JBL Charge',
            'Loa Nghe Nhạc Sony SRS',
            'Loa Nghe Nhạc Bose QuietComfort',
            'Loa Nghe Nhạc Harman Kardon',
            'Loa Nghe Nhạc Marshall Stanmore',
            'Loa Nghe Nhạc Audio-Technica',
            'Loa Nghe Nhạc Sennheiser HD',
            'Loa Nghe Nhạc Klipsch Heritage',
            'Loa Nghe Nhạc Bang & Olufsen Beoplay',
            'Loa Nghe Nhạc KEF LS',
            'Loa Nghe Nhạc Bowers & Wilkins',
            'Loa Nghe Nhạc Focal',
            'Loa Nghe Nhạc Dynaudio',
            'Loa Nghe Nhạc Monitor Audio',
            'Loa Nghe Nhạc Wharfedale',
        ],
        'Loa Bluetooth': [
            'Loa Bluetooth JBL Flip',
            'Loa Bluetooth Sony SRS-XB',
            'Loa Bluetooth Bose SoundLink',
            'Loa Bluetooth Harman Kardon',
            'Loa Bluetooth Marshall Kilburn',
            'Loa Bluetooth Audio-Technica',
            'Loa Bluetooth Sennheiser',
            'Loa Bluetooth Klipsch',
            'Loa Bluetooth Bang & Olufsen',
            'Loa Bluetooth KEF',
            'Loa Bluetooth UE Boom',
            'Loa Bluetooth Anker Soundcore',
            'Loa Bluetooth Tribit',
            'Loa Bluetooth OontZ',
            'Loa Bluetooth DOSS',
        ],
        'Loa Vi Tính': [
            'Loa Vi Tính JBL Pebbles',
            'Loa Vi Tính Sony SRS',
            'Loa Vi Tính Bose Companion',
            'Loa Vi Tính Harman Kardon',
            'Loa Vi Tính Marshall Acton',
            'Loa Vi Tính Audio-Technica',
            'Loa Vi Tính Sennheiser',
            'Loa Vi Tính Klipsch ProMedia',
            'Loa Vi Tính Bang & Olufsen',
            'Loa Vi Tính KEF',
            'Loa Vi Tính Logitech',
            'Loa Vi Tính Creative',
            'Loa Vi Tính Edifier',
            'Loa Vi Tính Microlab',
            'Loa Vi Tính Genius',
        ],
        'Đài Cassette': [
            'Đài Cassette Sony CFD',
            'Đài Cassette Panasonic RX',
            'Đài Cassette JVC',
            'Đài Cassette Sharp',
            'Đài Cassette Aiwa',
            'Đài Cassette Sanyo',
            'Đài Cassette Philips',
            'Đài Cassette Grundig',
            'Đài Cassette Telefunken',
            'Đài Cassette Akai',
            'Đài Cassette Technics',
            'Đài Cassette Pioneer',
            'Đài Cassette Yamaha',
            'Đài Cassette Denon',
            'Đài Cassette Onkyo',
        ],
    };

    console.log('Categories available:', categories.length);
    console.log('Brands available:', brands.length);

    // Tạo 50 sản phẩm cho mỗi danh mục (5 danh mục x 50 = 250 sản phẩm)
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
        const category = categories[categoryIndex];
        const categoryName = category.name;
        const productNames = productNamesByCategory[categoryName] || [];

        console.log(`Generating products for category: ${categoryName}`);

        for (let i = 0; i < 50; i++) {
            const basePrice = faker.number.int({ min: 500000, max: 15000000 }); // Giá từ 500k đến 15M
            const quantity = faker.number.int({ min: 0, max: 100 });

            // Chọn thương hiệu ngẫu nhiên
            const brand = faker.helpers.arrayElement(brands);

            // Tên sản phẩm
            const baseProductName = faker.helpers.arrayElement(productNames);
            const productName = `${baseProductName} ${faker.number.int({ min: 1, max: 999 })}`;

            const product = {
                name: productName,
                price: basePrice,
                description:
                    `${productName} với chất âm mạnh mẽ, âm trầm sâu và chi tiết rõ ràng. ` +
                    `Phù hợp cho ${categoryName.toLowerCase()} với công suất ổn định, kết nối hiện đại ` +
                    `và thiết kế bền bỉ. Bảo hành chính hãng, đổi trả dễ dàng.`,
                images: [getSpeakerImageUrl(400, 400), getSpeakerImageUrl(400, 400), getSpeakerImageUrl(400, 400)],
                category: category._id,
                brand: brand._id,
                quantity: quantity,
                minQuantity: faker.number.int({ min: 5, max: 20 }),
                maxQuantity: faker.number.int({ min: 100, max: 1000 }),
                costPrice: Math.floor(basePrice * 0.7),
                lastImportDate: faker.date.recent({ days: 30 }),
                lastImportQuantity: faker.number.int({ min: 10, max: 100 }),
                specs: {
                    color: faker.color.human(),
                    power: faker.helpers.arrayElement(['10W', '20W', '30W', '50W', '100W', '200W']),
                    connectivity: faker.helpers.arrayElement([
                        'Bluetooth 5.0',
                        'Bluetooth 5.1',
                        'Bluetooth 5.2',
                        'WiFi',
                        'Aux',
                    ]),
                    frequency: faker.helpers.arrayElement(['20Hz-20kHz', '40Hz-20kHz', '60Hz-18kHz']),
                    impedance: faker.helpers.arrayElement(['4Ω', '6Ω', '8Ω', '16Ω']),
                    material: faker.helpers.arrayElement(['Gỗ', 'Nhựa', 'Kim loại', 'Vải', 'Da']),
                },
            };
            products.push(product);
        }
    }

    const savedProducts = await Product.insertMany(products);
    console.log(`✅ Generated ${products.length} products (50 per category)`);
    return savedProducts; // Return saved products with _id
};

// Generate fake blogs (tin tức về loa đài - tiếng Việt)
const generateBlogs = async (count = 30) => {
    console.log('📰 Generating blogs...');
    const blogs = [];

    const blogTitles = [
        'Cách chọn loa karaoke phù hợp cho gia đình',
        'So sánh loa Bluetooth phổ biến năm nay',
        'Kinh nghiệm set-up dàn loa nghe nhạc Hi-Fi',
        'Những sai lầm thường gặp khi mua loa đài',
        'Top loa di động hay trong tầm giá 2-5 triệu',
        'Hướng dẫn bảo quản loa để tăng độ bền',
        'Âm học phòng và ảnh hưởng tới chất âm',
        'Công suất loa: hiểu đúng để mua đúng',
        'Cách kết nối loa với TV, PC và điện thoại',
        'Xu hướng loa đài 2025: nhỏ gọn và thông minh',
    ];

    for (let i = 0; i < count; i++) {
        const pickedTitle = faker.helpers.arrayElement(blogTitles);
        const blog = {
            title: pickedTitle,
            image: `https://source.unsplash.com/featured/800x400?speaker,audio`,
            content:
                `${pickedTitle}.\n\n` +
                `Giới thiệu: Nhu cầu sử dụng loa đài ngày càng tăng, từ giải trí gia đình đến sân khấu nhỏ. ` +
                `Trong bài viết này, chúng ta sẽ bàn về cách lựa chọn, lắp đặt và bảo quản loa để có trải nghiệm âm thanh tốt nhất.\n\n` +
                `1) Xác định nhu cầu sử dụng (karaoke, nghe nhạc, xem phim).\n` +
                `2) Chọn công suất phù hợp với diện tích phòng.\n` +
                `3) Ưu tiên kết nối hiện đại: Bluetooth 5.x, Wi-Fi, HDMI ARC, AUX.\n` +
                `4) Chú ý thông số: dải tần, trở kháng, độ nhạy, kích thước driver.\n` +
                `5) Bố trí vị trí đặt loa theo nguyên tắc tam giác cân, tránh góc tường.\n\n` +
                `Kết luận: Hãy nghe thử thực tế khi có thể và chọn thương hiệu uy tín như JBL, Sony, Bose, Marshall... ` +
                `Bảo quản đúng cách sẽ giúp loa bền bỉ và giữ chất âm ổn định qua thời gian.`,
        };
        blogs.push(blog);
    }

    await Blog.insertMany(blogs);
    console.log(`✅ Generated ${count} blogs`);
    return blogs;
};

// Generate fake coupons
const generateCoupons = async (count = 20) => {
    console.log('🎫 Generating coupons...');
    const coupons = [];

    for (let i = 0; i < count; i++) {
        const startDate = faker.date.recent({ days: 30 });
        const endDate = faker.date.future({ years: 1, refDate: startDate });

        const coupon = {
            nameCoupon: faker.string.alphanumeric(8).toUpperCase(),
            discount: faker.number.int({ min: 5, max: 50 }),
            quantity: faker.number.int({ min: 10, max: 1000 }),
            startDate: startDate,
            endDate: endDate,
            minPrice: faker.number.int({ min: 100000, max: 5000000 }),
            isActive: faker.datatype.boolean(),
        };
        coupons.push(coupon);
    }

    await Coupon.insertMany(coupons);
    console.log(`✅ Generated ${count} coupons`);
    return coupons;
};

// Generate fake imports
const generateImports = async (suppliers, users, count = 50) => {
    console.log('📦 Generating imports...');
    const imports = [];
    const adminUsers = users.filter((user) => user.role === 'admin');

    console.log('Suppliers available:', suppliers.length);
    console.log('First supplier ID:', suppliers[0]?._id);

    for (let i = 0; i < count; i++) {
        const importData = {
            importCode: 'IMP' + faker.string.alphanumeric(8).toUpperCase(),
            supplierId: suppliers[0]._id, // Use first supplier
            importDate: faker.date.recent({ days: 90 }),
            totalAmount: faker.number.int({ min: 1000000, max: 50000000 }),
            status: faker.helpers.arrayElement(['pending', 'completed', 'cancelled']),
            notes: faker.lorem.sentence(),
            createdBy: adminUsers[0]._id, // Use first admin
        };
        imports.push(importData);
    }

    const savedImports = await Import.insertMany(imports);
    console.log(`✅ Generated ${count} imports`);
    return savedImports; // Return saved imports with _id
};

// Generate fake import details
const generateImportDetails = async (imports, products, count = 100) => {
    console.log('📋 Generating import details...');
    const importDetails = [];
    const usedCombinations = new Set();

    console.log('Imports available:', imports.length);
    console.log('Products available:', products.length);

    for (let i = 0; i < count; i++) {
        let importData, product, combination;
        let attempts = 0;

        // Try to find a unique combination
        do {
            importData = faker.helpers.arrayElement(imports);
            product = faker.helpers.arrayElement(products);
            combination = `${importData._id}-${product._id}`;
            attempts++;
        } while (usedCombinations.has(combination) && attempts < 100);

        if (attempts >= 100) {
            console.log('⚠️ Could not find unique combination, skipping...');
            continue;
        }

        usedCombinations.add(combination);

        const quantity = faker.number.int({ min: 1, max: 100 });
        const importPrice = faker.number.int({ min: 100000, max: 10000000 });

        const importDetail = {
            importId: importData._id,
            productId: product._id,
            quantity: quantity,
            importPrice: importPrice,
            totalPrice: quantity * importPrice,
            notes: faker.lorem.sentence(),
        };
        importDetails.push(importDetail);
    }

    await ImportDetail.insertMany(importDetails);
    console.log(`✅ Generated ${importDetails.length} import details`);
    return importDetails;
};

// Generate fake cart items
const generateCartItems = async (users, products, count = 100) => {
    console.log('🛒 Generating cart items...');
    const cartItems = [];

    for (let i = 0; i < count; i++) {
        const user = faker.helpers.arrayElement(users);
        const product = faker.helpers.arrayElement(products);
        const quantity = faker.number.int({ min: 1, max: 10 });
        const totalPrice = product.price * quantity;

        const cartItem = {
            userId: user._id,
            productId: product._id,
            quantity: quantity,
            totalPrice: totalPrice,
            nameCoupon: faker.datatype.boolean() ? faker.string.alphanumeric(8).toUpperCase() : null,
        };
        cartItems.push(cartItem);
    }

    await Cart.insertMany(cartItems);
    console.log(`✅ Generated ${count} cart items`);
    return cartItems;
};

// Generate fake orders
const generateOrders = async (users, products, count = 80) => {
    console.log('💳 Generating orders...');
    const orders = [];
    const usedOrderIds = new Set();

    for (let i = 0; i < count; i++) {
        const user = faker.helpers.arrayElement(users);
        const product = faker.helpers.arrayElement(products);
        const quantity = faker.number.int({ min: 1, max: 5 });
        const totalPrice = product.price * quantity;

        // Generate unique order ID
        let orderId;
        let attempts = 0;
        do {
            orderId = 'ORD' + faker.string.alphanumeric(12).toUpperCase();
            attempts++;
        } while (usedOrderIds.has(orderId) && attempts < 100);

        if (attempts >= 100) {
            console.log('⚠️ Could not generate unique payment ID, skipping...');
            continue;
        }

        usedOrderIds.add(orderId);

        const order = {
            orderId: orderId,
            userId: user._id,
            items: [
                {
                    productId: product._id,
                    quantity: quantity,
                    totalPrice: totalPrice,
                },
            ],
            totalAmount: totalPrice,
            fullName: user.fullName,
            phoneNumber: user.phone || faker.phone.number('0#########'),
            address: user.address || faker.location.streetAddress({ useFullAddress: true }),
            email: user.email,
            status: faker.helpers.arrayElement(['pending', 'confirm', 'shipping', 'success', 'failed']),
            typePayment: faker.helpers.arrayElement(['cod', 'momo', 'vnpay']),
            nameCoupon: faker.datatype.boolean() ? faker.string.alphanumeric(8).toUpperCase() : null,
            note: faker.lorem.sentence(),
        };
        orders.push(order);
    }

    await Order.insertMany(orders);
    console.log(`✅ Generated ${orders.length} orders`);
    return orders;
};

// Generate fake notifications
const generateNotifications = async (users, orders, count = 150) => {
    console.log('🔔 Generating notifications...');
    const notifications = [];

    const notificationContents = [
        'Đơn hàng của bạn đã được xác nhận',
        'Đơn hàng đang được vận chuyển',
        'Đơn hàng đã được giao thành công',
        'Có sản phẩm mới phù hợp với sở thích của bạn',
        'Chương trình khuyến mãi đặc biệt đang diễn ra',
        'Cảm ơn bạn đã mua hàng tại cửa hàng chúng tôi',
        'Đánh giá sản phẩm để nhận ưu đãi',
        'Cập nhật thông tin cá nhân để nhận thông báo tốt hơn',
    ];

    for (let i = 0; i < count; i++) {
        const user = faker.helpers.arrayElement(users);
        const order = faker.helpers.arrayElement(orders);

        const notification = {
            content: faker.helpers.arrayElement(notificationContents),
            userId: user._id,
            isRead: faker.datatype.boolean(),
            paymentId: faker.datatype.boolean() ? order.orderId : '0',
        };
        notifications.push(notification);
    }

    await Notification.insertMany(notifications);
    console.log(`✅ Generated ${count} notifications`);
    return notifications;
};

// Main function
const generateAllData = async () => {
    try {
        await connectDB();

        // Clear existing data
        console.log('🗑️ Clearing existing data...');
        await User.deleteMany({});
        await Category.deleteMany({});
        await Brand.deleteMany({});
        await Product.deleteMany({});
        await Supplier.deleteMany({});
        await Blog.deleteMany({});
        await Coupon.deleteMany({});
        await ImportDetail.deleteMany({});
        await Import.deleteMany({});
        await Cart.deleteMany({});
        await Order.deleteMany({});
        await Notification.deleteMany({});
        console.log('✅ Cleared existing data');

        // Generate data
        const users = await generateUsers(50);
        const categories = await generateCategories();
        const brands = await generateBrands();
        const suppliers = await generateSuppliers(users);
        const products = await generateProducts(categories, brands);
        const blogs = await generateBlogs(30);
        const coupons = await generateCoupons(20);
        const imports = await generateImports(suppliers, users, 50);
        const importDetails = await generateImportDetails(imports, products, 200);
        const cartItems = await generateCartItems(users, products, 100);
        const orders = await generateOrders(users, products, 80);
        const notifications = await generateNotifications(users, orders, 150);

        console.log('\n🎉 === Data generation completed ===');
        console.log(`👥 Users: ${users.length}`);
        console.log(`📂 Categories: ${categories.length}`);
        console.log(`🏷️ Brands: ${brands.length}`);
        console.log(`🏢 Suppliers: ${suppliers.length}`);
        console.log(`📱 Products: ${products.length}`);
        console.log(`📰 Blogs: ${blogs.length}`);
        console.log(`🎫 Coupons: ${coupons.length}`);
        console.log(`📦 Imports: ${imports.length}`);
        console.log(`📋 Import Details: ${importDetails.length}`);
        console.log(`🛒 Cart Items: ${cartItems.length}`);
        console.log(`💳 Orders: ${orders.length}`);
        console.log(`🔔 Notifications: ${notifications.length}`);
    } catch (error) {
        console.error('❌ Error generating data:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
};

// Run the script
if (require.main === module) {
    generateAllData();
}

module.exports = {
    generateUsers,
    generateCategories,
    generateBrands,
    generateSuppliers,
    generateProducts,
    generateBlogs,
    generateCoupons,
    generateImports,
    generateImportDetails,
    generateCartItems,
    generateOrders,
    generateNotifications,
};
