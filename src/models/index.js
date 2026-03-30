const { sequelize } = require('../config/database');

const User = require('./User');
const Checkpoint = require('./Checkpoint');
const CheckpointStatusHistory = require('./CheckpointStatusHistory');
const Incident = require('./Incident');
const Report = require('./Report');
const ReportVote = require('./ReportVote');
const AlertSubscription = require('./AlertSubscription');
const Alert = require('./Alert');

// User associations
User.hasMany(Report, { foreignKey: 'user_id' });
User.hasMany(ReportVote, { foreignKey: 'user_id' });
User.hasMany(Alert, { foreignKey: 'user_id' });
User.hasMany(AlertSubscription, { foreignKey: 'user_id' });

// Checkpoint associations
Checkpoint.hasMany(CheckpointStatusHistory, { foreignKey: 'checkpoint_id' });
Checkpoint.hasMany(Incident, { foreignKey: 'checkpoint_id' });

// Incident associations
Incident.belongsTo(Checkpoint, { foreignKey: 'checkpoint_id' });
Incident.hasMany(Alert, { foreignKey: 'incident_id' });

// Report associations
Report.belongsTo(User, { foreignKey: 'user_id' });
Report.hasMany(ReportVote, { foreignKey: 'report_id' });

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
    Alert
};