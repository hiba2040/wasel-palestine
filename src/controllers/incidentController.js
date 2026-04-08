const Incident = require('../models/Incident');


const getAllIncidents = async (req, res) => {
    try {
        const {
            type, severity, status,
            page = 1, limit = 10,
            sortBy = 'id', order = 'ASC'
        } = req.query;

        const { rows, total } = await Incident.getAllRaw({
            type, severity, status,
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy, order
        });

        res.json({
            success: true,
            data: rows,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const getIncidentById = async (req, res) => {
    try {
        const incident = await Incident.findByPk(req.params.id);
        if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

        res.json({ success: true, data: incident });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const createIncident = async (req, res) => {
    try {
        const { checkpoint_id, type, severity, title, description, status, latitude, longitude } = req.body;

        if (!type || !title) {
            return res.status(400).json({ success: false, message: 'type and title are required' });
        }

        const incident = await Incident.create({
            checkpoint_id, type, severity, title,
            description, status, latitude, longitude,
            created_by: req.user.id
        });

        res.status(201).json({ success: true, data: incident });
    } catch (err) {
          console.error('createIncident error:', err);
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({ success: false, message: err.errors[0].message });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
    
};

const updateIncident = async (req, res) => {
    try {
        const incident = await Incident.findByPk(req.params.id);
        if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

        const { checkpoint_id, type, severity, title, description, status, latitude, longitude } = req.body;

        await incident.update({ checkpoint_id, type, severity, title, description, status, latitude, longitude });

        res.json({ success: true, data: incident });
    } catch (err) {
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({ success: false, message: err.errors[0].message });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const deleteIncident = async (req, res) => {
    try {
        const incident = await Incident.findByPk(req.params.id);
        if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

        await incident.destroy();
        res.json({ success: true, message: 'Incident deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const verifyIncident = async (req, res) => {
    try {
        const incident = await Incident.findByPk(req.params.id);
        if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

        if (incident.status === 'verified') {
            return res.status(400).json({ success: false, message: 'Incident is already verified' });
        }

        const updated = await Incident.verifyRaw(req.params.id, req.user.id);
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getAllIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    deleteIncident,
    verifyIncident
};