const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true, // tự thêm createdAt, updatedAt
    },
);

const Blog = mongoose.model('blog', blogSchema);
module.exports = Blog;
