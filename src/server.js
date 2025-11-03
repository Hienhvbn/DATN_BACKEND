const express = require('express');
const app = express();
const port = process.env.PORT || 3002;
const host = process.env.HOST || '0.0.0.0';
require('dotenv').config();

const { dbConnect } = require('./config/db.js');

const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const route = require('./routes/index.routes.js');
const { connectCloudinary } = require('./config/cloudinary.js');

// Trust proxy for secure cookies behind reverse proxies (e.g., Nginx)
app.set('trust proxy', 1);

app.use(
    cors({
        origin: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

dbConnect();
connectCloudinary();

route(app);

app.listen(port, host, () => {
    console.log(`Backend server is running at http://${host}:${port}`);
});
