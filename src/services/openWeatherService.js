const axios = require('axios');

const OPENWEATHER_BASE_URL = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5';

const getApiKey = () => process.env.OPENWEATHER_API_KEY;

const hazardousConditions = new Set([
    'Thunderstorm',
    'Tornado',
    'Squall',
    'Snow'
]);

const isHazardousWeather = (weatherData) => {
    if (!weatherData) {
        return false;
    }

    const mainCondition = weatherData.weather?.[0]?.main || '';
    const windSpeed = Number(weatherData.wind?.speed || 0);

    if (hazardousConditions.has(mainCondition)) {
        return true;
    }

    if (mainCondition === 'Rain' && windSpeed >= 10) {
        return true;
    }

    if (windSpeed >= 12) {
        return true;
    }

    return false;
};

const getWeatherByCoordinates = async (latitude, longitude) => {
    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            return {
                success: false,
                error: 'OpenWeather API key is missing'
            };
        }

        const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
            params: {
                lat: latitude,
                lon: longitude,
                appid: apiKey,
                units: 'metric'
            },
            timeout: 12000
        });

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to fetch weather from OpenWeatherMap',
            details: error.response?.data || error.message
        };
    }
};

const getWeatherAlerts = async (latitude, longitude) => {
    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            return {
                success: false,
                error: 'OpenWeather API key is missing'
            };
        }

        const response = await axios.get(`${OPENWEATHER_BASE_URL}/onecall`, {
            params: {
                lat: latitude,
                lon: longitude,
                appid: apiKey,
                units: 'metric',
                exclude: 'minutely,hourly,daily'
            },
            timeout: 12000
        });

        const alerts = response.data?.alerts || [];
        return {
            success: true,
            data: {
                alerts,
                count: alerts.length
            }
        };
    } catch (error) {
        return {
            success: true,
            data: {
                alerts: [],
                count: 0
            }
        };
    }
};

module.exports = {
    getWeatherByCoordinates,
    getWeatherAlerts,
    isHazardousWeather
};
