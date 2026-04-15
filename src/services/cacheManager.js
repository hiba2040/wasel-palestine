/**
 * Cache Manager Service
 * Handles Redis caching with fallback to Node cache
 * Provides unified caching interface
 */

const redis = require('redis');
const NodeCache = require('node-cache');
require('dotenv').config();

let redisClient;
let memoryCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
let useRedis = false;

const parsePort = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Initialize Redis client
 * Gracefully handles connection failures
 */
const initializeCache = async () => {
    try {
        redisClient = redis.createClient({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parsePort(process.env.REDIS_PORT, 6379),
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        return false;
                    }
                    return Math.min(retries * 100, 3000);
                }
            },
            password: process.env.REDIS_PASSWORD || undefined,
            pingInterval: 10000
        });

        redisClient.on('error', (err) => {
            console.warn('Redis error:', err.message);
            useRedis = false;
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis connected');
            useRedis = true;
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis ready');
        });

        await redisClient.connect();
        useRedis = true;
    } catch (error) {
        console.warn('⚠️  Could not connect to Redis:', error.message);
        console.warn('📦 Fallback to in-memory cache');
        useRedis = false;
    }
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: from env or 600)
 */
const set = async (key, value, ttl = null) => {
    try {
        if (!ttl) {
            ttl = parseInt(process.env.DEFAULT_CACHE_TTL || '600');
        }

        const serialized = JSON.stringify(value);

        if (useRedis && redisClient) {
            try {
                await redisClient.setEx(key, ttl, serialized);
                return true;
            } catch (error) {
                console.warn('Redis SET error, using memory cache:', error.message);
                memoryCache.set(key, value, ttl);
                return true;
            }
        } else {
            memoryCache.set(key, value, ttl);
            return true;
        }
    } catch (error) {
        console.error('Cache SET error:', error.message);
        return false;
    }
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or null
 */
const get = async (key) => {
    try {
        if (useRedis && redisClient) {
            try {
                const value = await redisClient.get(key);
                if (value) {
                    return JSON.parse(value);
                }
                return null;
            } catch (error) {
                console.warn('Redis GET error, checking memory cache:', error.message);
                return memoryCache.get(key) || null;
            }
        } else {
            return memoryCache.get(key) || null;
        }
    } catch (error) {
        console.error('Cache GET error:', error.message);
        return null;
    }
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 */
const del = async (key) => {
    try {
        if (useRedis && redisClient) {
            try {
                await redisClient.del(key);
            } catch (error) {
                console.warn('Redis DEL error:', error.message);
            }
        }
        memoryCache.del(key);
        return true;
    } catch (error) {
        console.error('Cache DEL error:', error.message);
        return false;
    }
};

/**
 * Clear all cache
 */
const clear = async () => {
    try {
        if (useRedis && redisClient) {
            try {
                await redisClient.flushAll();
            } catch (error) {
                console.warn('Redis FLUSHALL error:', error.message);
            }
        }
        memoryCache.flushAll();
        return true;
    } catch (error) {
        console.error('Cache CLEAR error:', error.message);
        return false;
    }
};

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 */
const has = async (key) => {
    try {
        if (useRedis && redisClient) {
            try {
                const exists = await redisClient.exists(key);
                return exists === 1;
            } catch (error) {
                console.warn('Redis EXISTS error:', error.message);
                return memoryCache.has(key);
            }
        } else {
            return memoryCache.has(key);
        }
    } catch (error) {
        console.error('Cache HAS error:', error.message);
        return false;
    }
};

/**
 * Get or set value (Cache-Aside pattern)
 * @param {string} key - Cache key
 * @param {Function} fetchFunction - Function to call if cache miss
 * @param {number} ttl - Time to live in seconds
 */
const getOrSet = async (key, fetchFunction, ttl = null) => {
    try {
        // Try to get from cache
        const cached = await get(key);
        if (cached !== null && cached !== undefined) {
            return cached;
        }

        // Cache miss - fetch fresh data
        const freshData = await fetchFunction();
        
        // Store in cache
        await set(key, freshData, ttl);
        
        return freshData;
    } catch (error) {
        console.error('Cache GET_OR_SET error:', error.message);
        // If cache fails, still try to fetch data
        return await fetchFunction();
    }
};

/**
 * Get cache status and statistics
 */
const getStatus = async () => {
    const stats = memoryCache.getStats();
    const totalLookups = stats.hits + stats.misses;

    return {
        redisConnected: useRedis && redisClient !== null,
        redisHost: process.env.REDIS_HOST || 'localhost',
        redisPort: parsePort(process.env.REDIS_PORT, 6379),
        memoryCacheKeys: stats.keys,
        memoryCacheHits: stats.hits,
        memoryCacheMisses: stats.misses,
        memoryCacheHitRate: totalLookups > 0
            ? `${((stats.hits / totalLookups) * 100).toFixed(2)}%`
            : '0%'
    };
};

/**
 * Disconnect cache (for graceful shutdown)
 */
const disconnect = async () => {
    try {
        if (useRedis && redisClient) {
            if (redisClient.isOpen) {
                await redisClient.disconnect();
            }
            console.log('✅ Redis disconnected');
        }
        memoryCache.flushAll();
        return true;
    } catch (error) {
        console.error('Cache disconnect error:', error.message);
        return false;
    }
};

module.exports = {
    initializeCache,
    set,
    get,
    del,
    clear,
    has,
    getOrSet,
    getStatus,
    disconnect
};
