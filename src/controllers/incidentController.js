const { Incident } = require('../models');

const getAllIncidents = async (req, res) => {
    try {
        const incidents = await Incident.findAll({
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: incidents
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch incidents',
            error: error.message
        });
    }
};

module.exports = {
    getAllIncidents
};
