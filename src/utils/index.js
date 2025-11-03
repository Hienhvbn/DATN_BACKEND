// Generate random string (used internally by generateImportCode)
const generateRandomString = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Generate import code
const generateImportCode = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = generateRandomString(3).toUpperCase();

    return `IMP-${year}${month}${day}-${random}`;
};

// Validate email
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate phone number
const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone);
};

// Validate tax code
const validateTaxCode = (taxCode) => {
    const taxCodeRegex = /^[0-9]{10,13}$/;
    return taxCodeRegex.test(taxCode);
};

// Calculate pagination
const calculatePagination = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    return {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: totalPages,
        skip,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
};

// Sanitize input
const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return input.trim().replace(/[<>]/g, '');
    }
    return input;
};

module.exports = {
    generateImportCode,
    validateEmail,
    validatePhone,
    validateTaxCode,
    calculatePagination,
    sanitizeInput,
};
