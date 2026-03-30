const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReportVote = sequelize.define('ReportVote', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    report_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    vote: {
        type: DataTypes.ENUM('up', 'down'),
        allowNull: false
    }
}, { tableName: 'report_votes', timestamps: true });

module.exports = ReportVote;