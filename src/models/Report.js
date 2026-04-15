const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Report = sequelize.define(
  'Report',
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
    category: {
      type: DataTypes.ENUM('checkpoint', 'road_closure', 'accident', 'weather', 'other'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 1000],
      },
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: -90,
        max: 90,
      },
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: -180,
        max: 180,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected', 'duplicate'),
      allowNull: false,
      defaultValue: 'pending',
    },
    confidence_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    moderated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    moderation_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'reports',
    timestamps: true,
  }
);

module.exports = Report;