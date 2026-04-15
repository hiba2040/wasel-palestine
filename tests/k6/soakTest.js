/**
 * k6 Soak Test Script
 * Tests system stability under sustained load over extended period
 * Detects memory leaks and resource exhaustion
 * 
 * Run: k6 run tests/k6/soakTest.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('soak_errors');
const responseTime = new Trend('soak_response_time');
const successfulRequests = new Counter('soak_successful_requests');
const failedRequests = new Counter('soak_failed_requests');
const memoryUsage = new Gauge('soak_memory');

// Soak testing configuration
export const options = {
    stages: [
        // Ramp-up: quickly get to target load
        { duration: '1m', target: 50 },
        // Soak: maintain steady load for extended period (15 minutes)
        { duration: '15m', target: 50 },
        // Ramp-down: gradually reduce load
        { duration: '2m', target: 0 },
    ],
    thresholds: {
        'soak_response_time': ['p(95)<600', 'p(99)<1200'], // Slightly higher than load test
        'soak_errors': ['rate<0.08'], // Error rate < 8%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
let authToken = '';
let checkpointIds = [];

export function setup() {
    const uniqueEmail = `soaktest_${Date.now()}@test.com`;
    
    // Register and login
    const registerRes = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify({
        name: 'Soak Test User',
        email: uniqueEmail,
        password: 'TestPassword123!'
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: uniqueEmail,
        password: 'TestPassword123!'
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    const loginData = JSON.parse(loginRes.body);
    
    // Get checkpoint IDs
    const checkpointsRes = http.get(`${BASE_URL}/api/v1/checkpoints?limit=10`, {
        headers: { 'Content-Type': 'application/json' },
    });
    
    const checkpointsData = JSON.parse(checkpointsRes.body);
    const ids = checkpointsData.data?.data?.map(cp => cp.id) || [1, 2, 3, 4, 5];

    return {
        authToken: loginData.data?.accessToken || '',
        checkpointIds: ids,
    };
}

export default function (data) {
    authToken = data.authToken;
    checkpointIds = data.checkpointIds;

    // Simulate realistic user behavior
    group('Soak - User Session', () => {
        // 1. Check user profile
        const profileRes = http.get(`${BASE_URL}/api/v1/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });

        check(profileRes, {
            'GET /auth/me status 200': (r) => r.status === 200,
        });

        sleep(0.5);

        // 2. Browse checkpoints
        const checkpointRes = http.get(`${BASE_URL}/api/v1/checkpoints?page=1&limit=20`, {
            headers: { 'Content-Type': 'application/json' },
        });

        check(checkpointRes, {
            'GET /checkpoints status 200': (r) => r.status === 200,
        });

        sleep(1);

        // 3. Get checkpoint details
        if (checkpointIds.length > 0) {
            const randomId = checkpointIds[Math.floor(Math.random() * checkpointIds.length)];
            const detailRes = http.get(`${BASE_URL}/api/v1/checkpoints/${randomId}`, {
                headers: { 'Content-Type': 'application/json' },
            });

            check(detailRes, {
                'GET /checkpoints/:id status 200 or 404': (r) => r.status === 200 || r.status === 404,
            });

            sleep(0.5);

            // 4. Get checkpoint status history
            const historyRes = http.get(`${BASE_URL}/api/v1/checkpoints/${randomId}/history?page=1&limit=10`, {
                headers: { 'Content-Type': 'application/json' },
            });

            check(historyRes, {
                'GET /checkpoints/:id/history status 200 or 404': (r) => r.status === 200 || r.status === 404,
            });
        }

        sleep(1);

        // 5. Estimate a route
        const routeRes = http.get(
            `${BASE_URL}/api/v1/routes/estimate?sourceLat=${31.9 + Math.random() * 0.1}&sourceLon=${35.2 + Math.random() * 0.1}&destLat=${31.96 + Math.random() * 0.1}&destLon=${35.19 + Math.random() * 0.1}`,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        check(routeRes, {
            'GET /routes/estimate status 200': (r) => r.status === 200,
        });

        sleep(1);

        // 6. Get cache status (monitoring)
        const cacheRes = http.get(`${BASE_URL}/api/v1/routes/cache-status`, {
            headers: { 'Content-Type': 'application/json' },
        });

        check(cacheRes, {
            'GET /routes/cache-status status 200': (r) => r.status === 200,
        });

        sleep(2);
    });

    // Monitor response times and errors
    group('Soak - Monitoring', () => {
        const healthRes = http.get(`${BASE_URL}/`, {
            headers: { 'Content-Type': 'application/json' },
        });

        const isHealthy = check(healthRes, {
            'Health check passed': (r) => r.status === 200,
            'Response time acceptable': (r) => r.timings.duration < 1000,
        });

        if (!isHealthy) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(healthRes.timings.duration);
    });
}

export function teardown(data) {
    console.log('Soak test completed');
    console.log('Test duration: 18 minutes');
    console.log('Check metrics for any memory leaks or response time degradation');
}
