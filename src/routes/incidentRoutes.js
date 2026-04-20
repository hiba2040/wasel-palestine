const express = require('express');
const router = express.Router();
const {
    getAllIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    deleteIncident,
    verifyIncident
} = require('../controllers/incidentController');
const { protect, isAdmin, isModerator } = require('../middleware/authMiddleware');


router.get('/',    getAllIncidents);
router.get('/:id', getIncidentById);


router.post('/', protect, isModerator, createIncident);


router.put('/:id',        protect, isModerator, updateIncident);
router.put('/:id/verify', protect, isModerator, verifyIncident);


router.delete('/:id', protect, isAdmin, deleteIncident);


module.exports = router;
