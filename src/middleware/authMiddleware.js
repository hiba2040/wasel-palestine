const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// alias عشان الـ routes الجديدة
const verifyToken = protect;

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

const isModerator = (req, res, next) => {
    if (!['admin', 'moderator'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Moderator access required' });
    }
    next();
};

// dynamic role checker عشان requireRole('admin', 'moderator')
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Required roles: ${roles.join(', ')}` 
            });
        }
        next();
    };
};

module.exports = { protect, verifyToken, isAdmin, isModerator, requireRole };