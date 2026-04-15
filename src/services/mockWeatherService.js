/**
 * Mock Weather Service
 * Simulates OpenWeather API for weather data
 */

// Mock weather conditions
const weatherConditions = [
    { main: 'Clear', description: 'clear sky', icon: '01d' },
    { main: 'Clouds', description: 'few clouds', icon: '02d' },
    { main: 'Clouds', description: 'scattered clouds', icon: '03d' },
    { main: 'Clouds', description: 'broken clouds', icon: '04d' },
    { main: 'Rain', description: 'light rain', icon: '09d' },
    { main: 'Rain', description: 'moderate rain', icon: '10d' },
    { main: 'Thunderstorm', description: 'thunderstorm', icon: '11d' },
    { main: 'Snow', description: 'light snow', icon: '13d' },
    { main: 'Mist', description: 'mist', icon: '50d' }
];

/**
 * Get random weather condition
 */
const getRandomWeather = () => {
    return weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
};

/**
 * Generate realistic temperature for Palestine region (15-40°C)
 */
const generateTemperature = () => {
    const hour = new Date().getHours();
    let baseTemp = 25; // Base temperature
    
    // Simulate daily temperature variation
    if (hour >= 0 && hour < 6) baseTemp = 15; // Night: cold
    else if (hour >= 6 && hour < 12) baseTemp = 20; // Morning: warming
    else if (hour >= 12 && hour < 18) baseTemp = 35; // Afternoon: hot
    else baseTemp = 25; // Evening: cooling
    
    // Add random variation (±5°C)
    const variation = (Math.random() - 0.5) * 10;
    return Math.round((baseTemp + variation) * 10) / 10;
};

/**
 * Get weather for a specific location
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>} Weather data
 */
const getWeatherByCoordinates = async (latitude, longitude) => {
    try {
        const weather = getRandomWeather();
        const temperature = generateTemperature();
        
        return {
            success: true,
            data: {
                coord: { lon: longitude, lat: latitude },
                weather: [weather],
                main: {
                    temp: temperature,
                    feels_like: temperature - 2,
                    temp_min: temperature - 3,
                    temp_max: temperature + 2,
                    pressure: 1013,
                    humidity: Math.floor(Math.random() * 40) + 40 // 40-80%
                },
                wind: {
                    speed: Math.floor(Math.random() * 15), // 0-15 m/s
                    deg: Math.floor(Math.random() * 360)
                },
                visibility: Math.floor(Math.random() * 5000) + 5000, // 5-10km
                clouds: { all: Math.floor(Math.random() * 100) },
                dt: Math.floor(Date.now() / 1000),
                sys: {
                    country: 'PS',
                    sunrise: Math.floor(Date.now() / 1000) - 18000,
                    sunset: Math.floor(Date.now() / 1000) + 18000
                },
                timezone: 7200,
                id: Math.floor(Math.random() * 1000000),
                name: 'Location',
                cod: 200
            }
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to fetch weather',
            details: error.message
        };
    }
};

/**
 * Get weather alerts for a region
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>} Weather alerts
 */
const getWeatherAlerts = async (latitude, longitude) => {
    try {
        const alerts = [];
        
        // Randomly generate alerts (20% chance)
        if (Math.random() < 0.2) {
            alerts.push({
                event: 'Heavy Rain Warning',
                start: Math.floor(Date.now() / 1000),
                end: Math.floor(Date.now() / 1000) + 3600,
                description: 'Heavy rain expected in the next hour'
            });
        }
        
        if (Math.random() < 0.1) {
            alerts.push({
                event: 'Wind Advisory',
                start: Math.floor(Date.now() / 1000),
                end: Math.floor(Date.now() / 1000) + 7200,
                description: 'High winds expected'
            });
        }
        
        return {
            success: true,
            data: {
                alerts: alerts,
                count: alerts.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to fetch weather alerts',
            details: error.message
        };
    }
};

/**
 * Get weather forecast for multiple days
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} days - Number of days to forecast (default: 5)
 * @returns {Promise<Object>} Weather forecast
 */
const getWeatherForecast = async (latitude, longitude, days = 5) => {
    try {
        const forecast = [];
        const currentDate = new Date();
        
        for (let i = 0; i < days; i++) {
            const forecastDate = new Date(currentDate);
            forecastDate.setDate(forecastDate.getDate() + i);
            
            const weather = getRandomWeather();
            const temp = generateTemperature() + (Math.random() - 0.5) * 5;
            
            forecast.push({
                dt: Math.floor(forecastDate.getTime() / 1000),
                main: {
                    temp: Math.round(temp * 10) / 10,
                    temp_min: Math.round((temp - 3) * 10) / 10,
                    temp_max: Math.round((temp + 3) * 10) / 10,
                    humidity: Math.floor(Math.random() * 40) + 40
                },
                weather: [weather],
                wind: {
                    speed: Math.floor(Math.random() * 15),
                    deg: Math.floor(Math.random() * 360)
                },
                clouds: { all: Math.floor(Math.random() * 100) }
            });
        }
        
        return {
            success: true,
            data: {
                list: forecast,
                city: {
                    name: 'Palestine',
                    coord: { lat: latitude, lon: longitude },
                    country: 'PS'
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to fetch weather forecast',
            details: error.message
        };
    }
};

/**
 * Check if weather is hazardous for travel
 * @param {Object} weatherData
 * @returns {boolean} True if hazardous
 */
const isHazardousWeather = (weatherData) => {
    if (!weatherData || !weatherData.main) return false;
    
    const mainCondition = weatherData.weather?.[0]?.main || '';
    const wind = weatherData.wind?.speed || 0;
    
    // Hazardous conditions
    const hazardousConditions = ['Thunderstorm', 'Heavy Rain', 'Snow', 'Tornado'];
    const isHazardousCondition = hazardousConditions.some(cond => mainCondition.includes(cond));
    const isHighWind = wind > 12; // > 12 m/s
    
    return isHazardousCondition || isHighWind;
};

module.exports = {
    getWeatherByCoordinates,
    getWeatherAlerts,
    getWeatherForecast,
    isHazardousWeather,
    getRandomWeather
};
