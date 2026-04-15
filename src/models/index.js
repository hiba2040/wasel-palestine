const { sequelize } = require('../config/database');

const User = require('./User');
const Checkpoint = require('./Checkpoint');
const CheckpointStatusHistory = require('./CheckpointStatusHistory');
const Incident = require('./Incident');
const Report = require('./Report');
const ReportVote = require('./ReportVote');
const AlertSubscription = require('./AlertSubscription');
const Alert = require('./Alert');
const ModerationAction = require('./ModerationAction');

// User associations
User.hasMany(Report, { foreignKey: 'user_id', as: 'reports' });
User.hasMany(ReportVote, { foreignKey: 'user_id', as: 'reportVotes' });
User.hasMany(Alert, { foreignKey: 'user_id', as: 'alerts' });
User.hasMany(AlertSubscription, { foreignKey: 'user_id', as: 'alertSubscriptions' });
User.hasMany(Report, { foreignKey: 'moderated_by', as: 'moderatedReports' });
User.hasMany(ModerationAction, { foreignKey: 'moderator_id', as: 'moderationActions' });

// Checkpoint associations
Checkpoint.hasMany(CheckpointStatusHistory, { foreignKey: 'checkpoint_id', as: 'statusHistory' });
Checkpoint.hasMany(Incident, { foreignKey: 'checkpoint_id', as: 'incidents' });

// CheckpointStatusHistory associations
CheckpointStatusHistory.belongsTo(Checkpoint, { foreignKey: 'checkpoint_id', as: 'checkpoint' });

// Incident associations
Incident.belongsTo(Checkpoint, { foreignKey: 'checkpoint_id', as: 'checkpoint' });
Incident.hasMany(Alert, { foreignKey: 'incident_id', as: 'alerts' });

// Report associations
Report.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Report.belongsTo(User, { foreignKey: 'moderated_by', as: 'moderator' });
Report.hasMany(ReportVote, { foreignKey: 'report_id', as: 'votes' });
Report.hasMany(ModerationAction, { foreignKey: 'report_id', as: 'moderationActions' });

// ReportVote associations
ReportVote.belongsTo(Report, { foreignKey: 'report_id', as: 'report' });
ReportVote.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// AlertSubscription associations
AlertSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Alert associations
Alert.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Alert.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });

// ModerationAction associations
ModerationAction.belongsTo(Report, { foreignKey: 'report_id', as: 'report' });
ModerationAction.belongsTo(User, { foreignKey: 'moderator_id', as: 'moderator' });

// Sync all models
const syncDB = async () => {
  await sequelize.sync({ alter: true });
  console.log('All tables synced ✅');
};

module.exports = {
  sequelize,
  syncDB,
  User,
  Checkpoint,
  CheckpointStatusHistory,
  Incident,
  Report,
  ReportVote,
  AlertSubscription,
  Alert,
  ModerationAction,
};