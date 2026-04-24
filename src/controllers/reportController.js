const { Op } = require('sequelize');
const { Report, ReportVote, ModerationAction } = require('../models');

const getAllReports = async (req, res) => {
    try {
        const {
            status,
            category,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            order = 'DESC'
        } = req.query;

        const where = {};
        if (status) where.status = status;
        if (category) where.category = category;

        const validSortFields = ['createdAt', 'updatedAt', 'confidence_score', 'status'];
        const validOrders = ['ASC', 'DESC'];

        const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const safeOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const reports = await Report.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [[safeSortBy, safeOrder]]
        });

        res.status(200).json({
            success: true,
            total: reports.count,
            page: parseInt(page),
            pages: Math.ceil(reports.count / parseInt(limit)),
            data: reports.rows
        });
    } catch (error) {
        console.error('Error getting reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports'
        });
    }
};

const createReport = async (req, res) => {
    try {
        const { latitude, longitude, category, description } = req.body;

        if (
            latitude === undefined ||
            longitude === undefined ||
            !category ||
            !description
        ) {
            return res.status(400).json({
                success: false,
                message: 'latitude, longitude, category, and description are required'
            });
        }

        const timeWindow = new Date(Date.now() - 2 * 60 * 60 * 1000); // آخر ساعتين
        const locationThreshold = 0.01; // تقريبًا 1 كم بشكل مبسط

        const duplicateReport = await Report.findOne({
            where: {
                category,
                createdAt: {
                    [Op.gte]: timeWindow
                },
                latitude: {
                    [Op.between]: [latitude - locationThreshold, latitude + locationThreshold]
                },
                longitude: {
                    [Op.between]: [longitude - locationThreshold, longitude + locationThreshold]
                }
            }
        });

        if (duplicateReport) {
            return res.status(409).json({
                success: false,
                message: 'Possible duplicate report detected',
                duplicate_report_id: duplicateReport.id
            });
        }

        const report = await Report.create({
            user_id: req.user.id,
            latitude,
            longitude,
            category,
            description,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create report'
        });
    }
};

const moderateReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, moderation_note } = req.body;

        const allowedStatuses = ['verified', 'rejected', 'duplicate'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid moderation status'
            });
        }

        const report = await Report.findByPk(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        report.status = status;
        report.moderated_by = req.user.id;
        report.moderation_note = moderation_note || null;

        await report.save();

        await ModerationAction.create({
            report_id: report.id,
            moderator_id: req.user.id,
            action: status,
            note: moderation_note || null
        });

        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error moderating report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to moderate report'
        });
    }
};

const voteReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { vote } = req.body;

        if (!['up', 'down'].includes(vote)) {
            return res.status(400).json({
                success: false,
                message: 'Vote must be either "up" or "down"'
            });
        }

        const report = await Report.findByPk(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        if (report.user_id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot vote on your own report'
            });
        }

        const existingVote = await ReportVote.findOne({
            where: {
                report_id: id,
                user_id: req.user.id
            }
        });

        if (existingVote) {
            return res.status(400).json({
                success: false,
                message: 'You already voted on this report'
            });
        }

        const newVote = await ReportVote.create({
            report_id: id,
            user_id: req.user.id,
            vote
        });

        const upVotes = await ReportVote.count({
            where: { report_id: id, vote: 'up' }
        });

        const downVotes = await ReportVote.count({
            where: { report_id: id, vote: 'down' }
        });

        const totalVotes = upVotes + downVotes;
        const confidenceScore = totalVotes === 0 ? 0 : upVotes / totalVotes;

        report.confidence_score = confidenceScore;
        await report.save();

        res.status(201).json({
            success: true,
            data: newVote,
            confidence_score: confidenceScore
        });
    } catch (error) {
        console.error('Error voting on report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to vote on report'
        });
    }
};


const getReportModerationHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const report = await Report.findByPk(id);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        const history = await ModerationAction.findAll({
            where: { report_id: id },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error getting moderation history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch moderation history'
        });
    }
};

module.exports = {
    getAllReports,
    createReport,
    moderateReport,
    voteReport,
    getReportModerationHistory
};