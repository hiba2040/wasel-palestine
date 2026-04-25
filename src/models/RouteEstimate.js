const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const RouteEstimate = sequelize.define('RouteEstimate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    source_lat: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    source_lon: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    destination_lat: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    destination_lon: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    distance_km: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    estimated_time_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    safety_score: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        comment: 'Safety score from 0-100 based on checkpoint status'
    },
    hazardous_checkpoints: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of closed/restricted checkpoints on route'
    },
    weather_condition: {
        type: DataTypes.STRING(255),
        defaultValue: 'unknown'
    },
    weather_hazard: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    avg_speed_kmh: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    route_polyline: {
        type: DataTypes.TEXT,
        comment: 'Encoded polyline of the route'
    },
    alternative_routes_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    estimated_cost: {
        type: DataTypes.FLOAT,
        comment: 'Estimated travel cost if applicable'
    },
    created_by_user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        },
        allowNull: true
    },
    is_cached: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this estimate came from cache'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'route_estimates',
    timestamps: true
});

/**
 * Get route estimates with filters
 */
RouteEstimate.getAllRaw = async ({ page = 1, limit = 10, sortBy = 'createdAt', order = 'DESC' }) => {
    try {
        const offset = (page - 1) * limit;
        const validSortBy = ['id', 'distance_km', 'estimated_time_minutes', 'safety_score', 'createdAt'];
        const validOrder = ['ASC', 'DESC'];
        
        const sortField = validSortBy.includes(sortBy) ? sortBy : 'createdAt';
        const sortOrder = validOrder.includes(order) ? order : 'DESC';

        const { count, rows } = await RouteEstimate.findAndCountAll({
            offset,
            limit,
            order: [[sortField, sortOrder]]
        });

        return {
            data: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        };
    } catch (error) {
        throw new Error(`Failed to fetch route estimates: ${error.message}`);
    }
};

/**
 * Find route by coordinates (with tolerance)
 */
RouteEstimate.findBySimilarRoute = async (sourceLat, sourceLon, destLat, destLon, tolerance = 0.01) => {
    try {
        const estimate = await RouteEstimate.findOne({
            where: {
                source_lat: { [Op.between]: [sourceLat - tolerance, sourceLat + tolerance] },
                source_lon: { [Op.between]: [sourceLon - tolerance, sourceLon + tolerance] },
                destination_lat: { [Op.between]: [destLat - tolerance, destLat + tolerance] },
                destination_lon: { [Op.between]: [destLon - tolerance, destLon + tolerance] }
            },
            order: [['createdAt', 'DESC']],
            limit: 1
        });

        return estimate;
    } catch (error) {
        throw new Error(`Failed to find similar route: ${error.message}`);
    }
};

/**
 * Get high safety routes (safety_score > 70)
 */
RouteEstimate.getHighSafetyRoutes = async (limit = 10) => {
    try {
        return await RouteEstimate.findAll({
            where: {
                safety_score: { [Op.gte]: 70 }
            },
            order: [['safety_score', 'DESC']],
            limit
        });
    } catch (error) {
        throw new Error(`Failed to fetch high safety routes: ${error.message}`);
    }
};

/**
 * Get dangerous routes (safety_score < 30)
 */
RouteEstimate.getDangerousRoutes = async (limit = 10) => {
    try {
        return await RouteEstimate.findAll({
            where: {
                safety_score: { [Op.lt]: 30 }
            },
            order: [['safety_score', 'ASC']],
            limit
        });
    } catch (error) {
        throw new Error(`Failed to fetch dangerous routes: ${error.message}`);
    }
};

module.exports = RouteEstimate;
