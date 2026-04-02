const Checkpoint = require('../models/Checkpoint');


const getAllCheckpoints = async (req, res) => {
  try {
    const { status, region, page, limit, sortBy, order } = req.query;
    const result = await Checkpoint.getAllRaw({ status, region, page, limit, sortBy, order });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('getAllCheckpoints error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getCheckpointById = async (req, res) => {
  try {
    const checkpoint = await Checkpoint.findByPk(req.params.id);
    if (!checkpoint) return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    res.json({ success: true, data: checkpoint });
  } catch (err) {
    console.error('getCheckpointById error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createCheckpoint = async (req, res) => {
  try {
    const { name, latitude, longitude, status, description, region } = req.body;
    if (!name || latitude === undefined || longitude === undefined || !region) {
      return res.status(400).json({
        success: false,
        message: 'name, latitude, longitude, and region are required',
      });
    }
    const checkpoint = await Checkpoint.create({ name, latitude, longitude, status, description, region });
    res.status(201).json({ success: true, data: checkpoint });
  } catch (err) {
    console.error('createCheckpoint error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


const updateCheckpoint = async (req, res) => {
  try {
    const checkpoint = await Checkpoint.findByPk(req.params.id);
    if (!checkpoint) return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    const { name, latitude, longitude, description, region } = req.body;
    await checkpoint.update({ name, latitude, longitude, description, region });
    res.json({ success: true, data: checkpoint });
  } catch (err) {
    console.error('updateCheckpoint error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


const deleteCheckpoint = async (req, res) => {
  try {
    const checkpoint = await Checkpoint.findByPk(req.params.id);
    if (!checkpoint) return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    await checkpoint.destroy();
    res.json({ success: true, message: 'Checkpoint deleted successfully' });
  } catch (err) {
    console.error('deleteCheckpoint error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


const getCheckpointStatus = async (req, res) => {
  try {
    const checkpoint = await Checkpoint.findByPk(req.params.id, {
      attributes: ['id', 'name', 'status'],
    });
    if (!checkpoint) return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    res.json({ success: true, data: checkpoint });
  } catch (err) {
    console.error('getCheckpointStatus error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


const updateCheckpointStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['open', 'closed', 'restricted', 'unknown'];
    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(', ')}`,
      });
    }
    const updated = await Checkpoint.updateStatusRaw(req.params.id, status, req.user.id, note);
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err.message === 'Checkpoint not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    console.error('updateCheckpointStatus error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getStatusHistory = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const checkpoint = await Checkpoint.findByPk(req.params.id);
    if (!checkpoint) return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    const result = await Checkpoint.getStatusHistory(req.params.id, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('getStatusHistory error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getAllCheckpoints,
  getCheckpointById,
  createCheckpoint,
  updateCheckpoint,
  deleteCheckpoint,
  getCheckpointStatus,
  updateCheckpointStatus,
  getStatusHistory,
};