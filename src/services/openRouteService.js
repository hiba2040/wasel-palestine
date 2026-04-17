const axios = require('axios');

const ORS_BASE_URL = process.env.OPENROUTESERVICE_BASE_URL || 'https://api.openrouteservice.org/v2/directions/driving-car';

const getApiKey = () => process.env.OPENROUTESERVICE_API_KEY;

const buildHeaders = () => ({
    Authorization: getApiKey()
});

const parseRouteResponse = (payload) => {
    const feature = payload?.features?.[0];
    if (!feature) {
        return null;
    }

    const summary = feature.properties?.summary || {};
    const geometryCoordinates = feature.geometry?.coordinates || [];
    const distanceKm = Number(((summary.distance || 0) / 1000).toFixed(2));
    const estimatedTime = Math.max(1, Math.ceil((summary.duration || 0) / 60));
    const avgSpeed = estimatedTime > 0
        ? Number((distanceKm / (estimatedTime / 60)).toFixed(2))
        : 0;

    return {
        distance: distanceKm,
        distanceUnit: 'km',
        estimatedTime,
        timeUnit: 'minutes',
        polyline: geometryCoordinates,
        geometryCoordinates,
        steps: feature.properties?.segments?.[0]?.steps?.length || 0,
        avgSpeed,
        confidence: 1,
        status: 'OK'
    };
};

const estimateRoute = async (sourceLat, sourceLon, destLat, destLon) => {
    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            return {
                success: false,
                error: 'OpenRouteService API key is missing'
            };
        }

        const response = await axios.get(ORS_BASE_URL, {
            headers: buildHeaders(),
            params: {
                start: `${sourceLon},${sourceLat}`,
                end: `${destLon},${destLat}`
            },
            timeout: 15000
        });

        const route = parseRouteResponse(response.data);
        if (!route) {
            return {
                success: false,
                error: 'No route data returned from OpenRouteService'
            };
        }

        return {
            success: true,
            data: route
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to estimate route from OpenRouteService',
            details: error.response?.data || error.message
        };
    }
};

const getDirections = async (sourceLat, sourceLon, destLat, destLon) => {
    return estimateRoute(sourceLat, sourceLon, destLat, destLon);
};

const getAlternativeRoutes = async (sourceLat, sourceLon, destLat, destLon) => {
    try {
        const mainRoute = await estimateRoute(sourceLat, sourceLon, destLat, destLon);
        if (!mainRoute.success) {
            return mainRoute;
        }

        const base = mainRoute.data;
        const routes = [
            {
                name: 'Fastest Route',
                distance: Number((base.distance * 0.95).toFixed(2)),
                estimatedTime: Math.max(1, Math.ceil(base.estimatedTime * 0.9)),
                avgSpeed: Number((base.avgSpeed * 1.05).toFixed(2)),
                confidence: 0.95
            },
            {
                name: 'Balanced Route',
                distance: base.distance,
                estimatedTime: base.estimatedTime,
                avgSpeed: base.avgSpeed,
                confidence: 1
            },
            {
                name: 'Safer Route',
                distance: Number((base.distance * 1.08).toFixed(2)),
                estimatedTime: Math.max(1, Math.ceil(base.estimatedTime * 1.12)),
                avgSpeed: Number((base.avgSpeed * 0.93).toFixed(2)),
                confidence: 0.9
            }
        ];

        return {
            success: true,
            data: routes,
            geometryCoordinates: base.geometryCoordinates
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to build alternative routes',
            details: error.message
        };
    }
};

module.exports = {
    estimateRoute,
    getDirections,
    getAlternativeRoutes
};
