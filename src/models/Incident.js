const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Incident = sequelize.define('Incident', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    checkpoint_id: { type: DataTypes.INTEGER },
    type: {
        type: DataTypes.ENUM('closure', 'delay', 'accident', 'weather_hazard', 'other'),
        allowNull: false
    },
    severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium'
    },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    status: {
        type: DataTypes.ENUM('active', 'verified', 'closed'),
        defaultValue: 'active'
    },
    latitude: { type: DataTypes.FLOAT },
    longitude: { type: DataTypes.FLOAT },
    created_by: { type: DataTypes.INTEGER }
}, { tableName: 'incidents', timestamps: true });

module.exports = Incident;