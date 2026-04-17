const { Alert } = require('../models');

const getAllAlerts = async (req, res) => {
    try {
        const alerts = await Alert.findAll({
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch alerts',
            error: error.message
        });
    }
};

module.exports = {
    getAllAlerts
};
