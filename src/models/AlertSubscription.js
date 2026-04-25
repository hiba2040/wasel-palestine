const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AlertSubscription = sequelize.define(
  'AlertSubscription',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 255],
      },
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: -90,
        max: 90,
      },
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: -180,
        max: 180,
      },
    },
    radius_km: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'alert_subscriptions',
    timestamps: true,
  }
);

module.exports = AlertSubscription;