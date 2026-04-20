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


Incident.getAllRaw = async ({ type, severity, status, page, limit, sortBy, order }) => {
    const offset = (page - 1) * limit;
    const conditions = [];
    const replacements = [];

    if (type)     { conditions.push(`type = ?`);     replacements.push(type); }
    if (severity) { conditions.push(`severity = ?`); replacements.push(severity); }
    if (status)   { conditions.push(`status = ?`);   replacements.push(status); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const validSortFields = ['id', 'title', 'type', 'severity', 'status', 'createdAt'];
    const validOrders     = ['ASC', 'DESC'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'id';
    const normalizedOrder = (order || 'ASC').toUpperCase();
    const safeOrder = validOrders.includes(normalizedOrder) ? normalizedOrder : 'ASC';

    const dataQuery = `
        SELECT * FROM incidents
        ${whereClause}
        ORDER BY "${safeSortBy}" ${safeOrder}
        LIMIT ? OFFSET ?
    `;
    const countQuery = `SELECT COUNT(*) as count FROM incidents ${whereClause}`;

    const [rows]  = await sequelize.query(dataQuery,  { replacements: [...replacements, limit, offset] });
    const [count] = await sequelize.query(countQuery, { replacements });

    return { rows, total: parseInt(count[0].count) };
};


Incident.verifyRaw = async (id) => {
    const transaction = await sequelize.transaction();
    try {
        await sequelize.query(
            `UPDATE incidents SET status = 'verified', "updatedAt" = NOW() WHERE id = ?`,
            { replacements: [id], transaction }
        );
        const [rows] = await sequelize.query(
            `SELECT incidents.*, users.name as verified_by_name
             FROM incidents
            LEFT JOIN users ON users.id = incidents.created_by
WHERE incidents.id = ?`,
            { replacements: [id], transaction }
        );
        await transaction.commit();
        return rows[0];
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

module.exports = Incident;