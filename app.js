const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./src/config/database');
const { syncDB } = require('./src/models/index');
const authRoutes = require('./src/routes/authRoutes');
const checkpointRoutes = require('./src/routes/checkpointRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/checkpoints', checkpointRoutes);

app.get('/', (req, res) => {
    res.json({ 
        message: 'Wasel Palestine API is running 🚀',
        version: 'v1'
    });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await connectDB();
    await syncDB();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();

module.exports = app;