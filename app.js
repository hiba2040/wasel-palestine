const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./src/config/database');
const { syncDB } = require('./src/models/index');
const authRoutes = require('./src/routes/authRoutes');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Routes
app.use('/api/v1/auth', authRoutes);

// Test Route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Wasel Palestine API is running 🚀',
        version: 'v1'
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await connectDB();
    await syncDB();
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;