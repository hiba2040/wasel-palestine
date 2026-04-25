const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./src/config/database');
const { syncDB } = require('./src/models/index');
const cacheManager = require('./src/services/cacheManager');

const authRoutes = require('./src/routes/authRoutes');
const checkpointRoutes = require('./src/routes/checkpointRoutes');
const routeRoutes = require('./src/routes/routeRoutes');
const incidentRoutes = require('./src/routes/incidentRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const alertRoutes = require('./src/routes/alertRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

app.use(limiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/checkpoints', checkpointRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/alerts', alertRoutes);

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Wasel Palestine API is running 🚀',
        version: 'v1'
    });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();
        await syncDB();
        await cacheManager.initializeCache();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;