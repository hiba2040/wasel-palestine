const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ============================================================
// ORM Definition
// ============================================================
const Checkpoint = sequelize.define('Checkpoint', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'closed', 'restricted', 'unknown'),
    defaultValue: 'unknown',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  region: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
}, {
  tableName: 'checkpoints',
  timestamps: true, // createdAt + updatedAt
});

// ============================================================
// Raw SQL — getAll with filters, sorting, pagination
// ============================================================
Checkpoint.getAllRaw = async ({ status, region, page = 1, limit = 10, sortBy = 'id', order = 'ASC' }) => {
  const offset = (page - 1) * limit;
  const validSortFields = ['id', 'name', 'region', 'status', 'createdAt'];
  const validOrder = ['ASC', 'DESC'];

  if (!validSortFields.includes(sortBy)) sortBy = 'id';
  if (!validOrder.includes(order.toUpperCase())) order = 'ASC';

  let conditions = [];
  let replacements = {};

  if (status) {
    conditions.push(`status = :status`);
    replacements.status = status;
  }
  if (region) {
    conditions.push(`region ILIKE :region`);
    replacements.region = `%${region}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT * FROM checkpoints
    ${where}
    ORDER BY "${sortBy}" ${order}
    LIMIT :limit OFFSET :offset
  `;
  const countQuery = `SELECT COUNT(*) as total FROM checkpoints ${where}`;

  replacements.limit = parseInt(limit);
  replacements.offset = offset;

  const [data] = await sequelize.query(dataQuery, { replacements });
  const [countResult] = await sequelize.query(countQuery, { replacements });

  const total = parseInt(countResult[0].total);

  return {
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
  };
};

// ============================================================
// Raw SQL — update status + insert history (Transaction)
// ============================================================
Checkpoint.updateStatusRaw = async (id, newStatus, changedBy, note = null) => {
  const transaction = await sequelize.transaction();
  try {
    // 1) Get current status
    const [rows] = await sequelize.query(
      `SELECT status FROM checkpoints WHERE id = :id`,
      { replacements: { id }, transaction }
    );

    if (!rows.length) throw new Error('Checkpoint not found');
    const oldStatus = rows[0].status;

    // 2) Update checkpoint status
    await sequelize.query(
      `UPDATE checkpoints SET status = :newStatus, "updatedAt" = NOW() WHERE id = :id`,
      { replacements: { newStatus, id }, transaction }
    );

    // 3) Insert into status history
    await sequelize.query(
      `INSERT INTO checkpoint_status_history
        (checkpoint_id, old_status, new_status, changed_by, note, "createdAt", "updatedAt")
       VALUES (:id, :oldStatus, :newStatus, :changedBy, :note, NOW(), NOW())`,
      { replacements: { id, oldStatus, newStatus, changedBy, note }, transaction }
    );

    await transaction.commit();

    // 4) Return updated checkpoint
    const [updated] = await sequelize.query(
      `SELECT * FROM checkpoints WHERE id = :id`,
      { replacements: { id } }
    );
    return updated[0];

  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};


Checkpoint.getStatusHistory = async (checkpointId, { page = 1, limit = 10 } = {}) => {
  const offset = (page - 1) * limit;

  const [data] = await sequelize.query(
    `SELECT csh.*, u.name AS changed_by_name
     FROM checkpoint_status_history csh
     LEFT JOIN users u ON u.id = csh.changed_by
     WHERE csh.checkpoint_id = :checkpointId
     ORDER BY csh."createdAt" DESC
     LIMIT :limit OFFSET :offset`,
    { replacements: { checkpointId, limit: parseInt(limit), offset } }
  );

  const [countResult] = await sequelize.query(
    `SELECT COUNT(*) as total FROM checkpoint_status_history WHERE checkpoint_id = :checkpointId`,
    { replacements: { checkpointId } }
  );

  const total = parseInt(countResult[0].total);
  return {
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
  };
};

module.exports = Checkpoint;