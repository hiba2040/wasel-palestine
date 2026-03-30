const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Report = sequelize.define('Report', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    category: {
        type: DataTypes.ENUM('checkpoint', 'road_closure', 'accident', 'weather', 'other'),
        allowNull: false
    },
    description: { type: DataTypes.TEXT, allowNull: false },
    latitude: { type: DataTypes.FLOAT, allowNull: false },
    longitude: { type: DataTypes.FLOAT, allowNull: false },
    status: {
        type: DataTypes.ENUM('pending', 'verified', 'rejected', 'duplicate'),
        defaultValue: 'pending'
    },
    confidence_score: { type: DataTypes.FLOAT, defaultValue: 0 },
    moderated_by: { type: DataTypes.INTEGER },
    moderation_note: { type: DataTypes.TEXT }
}, { tableName: 'reports', timestamps: true });

module.exports = Report;