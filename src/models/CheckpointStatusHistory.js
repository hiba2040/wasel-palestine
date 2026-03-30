const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CheckpointStatusHistory = sequelize.define('CheckpointStatusHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    checkpoint_id: { type: DataTypes.INTEGER, allowNull: false },
    old_status: { type: DataTypes.STRING },
    new_status: { type: DataTypes.STRING, allowNull: false },
    changed_by: { type: DataTypes.INTEGER },
    note: { type: DataTypes.TEXT }
}, { tableName: 'checkpoint_status_history', timestamps: true });

module.exports = CheckpointStatusHistory;