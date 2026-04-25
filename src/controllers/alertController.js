const { Alert, AlertSubscription } = require('../models');

const getMyAlerts = async (req, res) => {
    try {
        const alerts = await Alert.findAll({
            where: { user_id: req.user.id },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: alerts
        });
    } catch (error) {
        console.error('Error getting alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch alerts'
        });
    }
};

const createAlert = async (req, res) => {
    try {
        const { user_id, incident_id, title, message } = req.body;

        if (!user_id || !title || !message) {
            return res.status(400).json({
                success: false,
                message: 'user_id, title, and message are required'
            });
        }

        const alert = await Alert.create({
            user_id,
            incident_id: incident_id || null,
            title,
            message
        });

        res.status(201).json({
            success: true,
            data: alert
        });
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create alert'
        });
    }
};

const getMySubscriptions = async (req, res) => {
    try {
        const subscriptions = await AlertSubscription.findAll({
            where: { user_id: req.user.id }
        });

        res.status(200).json({
            success: true,
            data: subscriptions
        });
    } catch (error) {
        console.error('Error getting subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions'
        });
    }
};

const createSubscription = async (req, res) => {
    try {
        const { region, category, latitude, longitude, radius_km } = req.body;

        const hasRegion = !!region;
        const hasCategory = !!category;
        const hasCoordinates = latitude !== undefined && longitude !== undefined;

        if (!hasRegion && !hasCategory && !hasCoordinates) {
            return res.status(400).json({
                success: false,
                message: 'Provide at least region, category, or latitude and longitude'
            });
        }

        const subscription = await AlertSubscription.create({
            user_id: req.user.id,
            region: region || null,
            category: category || null,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            radius_km: radius_km || 10
        });

        res.status(201).json({
            success: true,
            data: subscription
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create subscription'
        });
    }
};

const markAlertAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const alert = await Alert.findOne({
            where: {
                id,
                user_id: req.user.id
            }
        });

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        alert.is_read = true;
        await alert.save();

        res.status(200).json({
            success: true,
            data: alert
        });
    } catch (error) {
        console.error('Error marking alert as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update alert'
        });
    }
};

module.exports = {
    getMyAlerts,
    createAlert,
    getMySubscriptions,
    createSubscription,
    markAlertAsRead
};