const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const RouteCache = sequelize.define('RouteCache', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    route_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'SHA256 hash of route coordinates'
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
    cached_data: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Cached route estimate data'
    },
    cache_ttl_seconds: {
        type: DataTypes.INTEGER,
        defaultValue: 3600,
        comment: 'Cache time-to-live in seconds'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When this cache entry expires'
    },
    hit_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of times this cache was used'
    },
    last_hit_at: {
        type: DataTypes.DATE,
        comment: 'Last time this cache was accessed'
    },
    is_valid: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether cache data is still valid'
    },
    invalidation_reason: {
        type: DataTypes.STRING(255),
        comment: 'Reason why cache was invalidated'
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
    tableName: 'route_cache',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['route_hash'] },
        { fields: ['expires_at'] },
        { fields: ['is_valid'] }
    ]
});

/**
 * Generate hash for route coordinates
 */
const generateRouteHash = (sourceLat, sourceLon, destLat, destLon) => {
    const crypto = require('crypto');
    const routeString = `${sourceLat}-${sourceLon}-${destLat}-${destLon}`;
    return crypto.createHash('sha256').update(routeString).digest('hex');
};

/**
 * Find cached route by coordinates
 */
RouteCache.findByRoute = async (sourceLat, sourceLon, destLat, destLon) => {
    try {
        const routeHash = generateRouteHash(sourceLat, sourceLon, destLat, destLon);
        
        const cached = await RouteCache.findOne({
            where: {
                route_hash: routeHash,
                is_valid: true,
                expires_at: { [Op.gt]: new Date() }
            }
        });

        if (cached) {
            // Update hit count and last hit time
            await cached.update({
                hit_count: cached.hit_count + 1,
                last_hit_at: new Date()
            });
        }

        return cached;
    } catch (error) {
        throw new Error(`Failed to find cached route: ${error.message}`);
    }
};

/**
 * Create or update route cache
 */
RouteCache.createOrUpdateCache = async (sourceLat, sourceLon, destLat, destLon, cachedData, ttl = 3600) => {
    try {
        const routeHash = generateRouteHash(sourceLat, sourceLon, destLat, destLon);
        const expiresAt = new Date(Date.now() + ttl * 1000);

        const [cache] = await RouteCache.findOrCreate({
            where: { route_hash: routeHash },
            defaults: {
                source_lat: sourceLat,
                source_lon: sourceLon,
                destination_lat: destLat,
                destination_lon: destLon,
                cached_data: cachedData,
                cache_ttl_seconds: ttl,
                expires_at: expiresAt
            }
        });

        // If exists, update it
        if (cache && cache.createdAt !== cache.updatedAt) {
            await cache.update({
                cached_data: cachedData,
                cache_ttl_seconds: ttl,
                expires_at: expiresAt,
                is_valid: true,
                invalidation_reason: null
            });
        }

        return cache;
    } catch (error) {
        throw new Error(`Failed to create/update route cache: ${error.message}`);
    }
};

/**
 * Invalidate cache by route
 */
RouteCache.invalidateByRoute = async (sourceLat, sourceLon, destLat, destLon, reason = 'Manual invalidation') => {
    try {
        const routeHash = generateRouteHash(sourceLat, sourceLon, destLat, destLon);
        
        await RouteCache.update({
            is_valid: false,
            invalidation_reason: reason
        }, {
            where: { route_hash: routeHash }
        });

        return true;
    } catch (error) {
        throw new Error(`Failed to invalidate cache: ${error.message}`);
    }
};

/**
 * Cleanup expired cache entries
 */
RouteCache.cleanupExpiredEntries = async () => {
    try {
        const deleted = await RouteCache.destroy({
            where: {
                expires_at: { [Op.lt]: new Date() }
            }
        });

        return deleted;
    } catch (error) {
        throw new Error(`Failed to cleanup expired entries: ${error.message}`);
    }
};

/**
 * Get cache statistics
 */
RouteCache.getStatistics = async () => {
    try {
        const total = await RouteCache.count();
        const valid = await RouteCache.count({ where: { is_valid: true } });
        const expired = await RouteCache.count({ where: { expires_at: { [Op.lt]: new Date() } } });
        
        const topUsed = await RouteCache.findAll({
            order: [['hit_count', 'DESC']],
            limit: 5,
            attributes: ['id', 'route_hash', 'hit_count', 'last_hit_at']
        });

        return {
            total,
            valid,
            expired,
            invalid: total - valid - expired,
            topUsedRoutes: topUsed
        };
    } catch (error) {
        throw new Error(`Failed to get cache statistics: ${error.message}`);
    }
};

RouteCache.generateRouteHash = generateRouteHash;

module.exports = RouteCache;
