const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AlertSubscription = sequelize.define('AlertSubscription', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    region: { type: DataTypes.STRING },
    category: { type: DataTypes.STRING },
    latitude: { type: DataTypes.FLOAT },
    longitude: { type: DataTypes.FLOAT },
    radius_km: { type: DataTypes.FLOAT, defaultValue: 10 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'alert_subscriptions', timestamps: true });

module.exports = AlertSubscription;