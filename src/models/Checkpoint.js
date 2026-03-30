const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Checkpoint = sequelize.define('Checkpoint', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    longitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('open', 'closed', 'delayed', 'unknown'),
        defaultValue: 'unknown'
    },
    description: {
        type: DataTypes.TEXT
    },
    region: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'checkpoints',
    timestamps: true
});

module.exports = Checkpoint;