const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ModerationAction = sequelize.define(
  'ModerationAction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    report_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    moderator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM('verified', 'rejected', 'duplicate'),
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'moderation_actions',
    timestamps: true,
  }
);

module.exports = ModerationAction;