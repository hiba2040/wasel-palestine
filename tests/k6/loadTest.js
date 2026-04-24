/**
 * k6 Load Test Script
 * Tests sustained load with gradual ramp-up and ramp-down
 * 
 * Run: k6 run tests/k6/loadTest.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Load testing configuration
export const options = {
    stages: [
        // Ramp-up: gradually increase load to 100 VUs
        { duration: '2m', target: 100 },
        // Sustain: maintain 100 VUs for 5 minutes
        { duration: '5m', target: 100 },
        // Ramp-down: gradually decrease load back to 0
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95th percentile < 500ms, 99th < 1000ms
        'http_req_failed': ['rate<0.1'], // Error rate < 10%
        'errors': ['rate<0.05'], // Custom error rate < 5%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
let authToken = '';
let userId = '';

// Setup: Register and login a test user
export function setup() {
    const setupGroup = group('Setup - User Registration and Login', () => {
        const uniqueEmail = `loadtest_${Date.now()}@test.com`;
        
        // Register
        const registerRes = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify({
            name: 'Load Test User',
            email: uniqueEmail,
            password: 'TestPassword123!'
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

        check(registerRes, {
            'registration status is 201 or 409': (r) => r.status === 201 || r.status === 409,
        });

        // Login
        const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
            email: uniqueEmail,
            password: 'TestPassword123!'
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

        check(loginRes, {
            'login status is 200': (r) => r.status === 200,
        });

        const loginData = JSON.parse(loginRes.body);
        return {
            authToken: loginData.data?.accessToken || '',
            userId: loginData.data?.user?.id || ''
        };
    });

    return setupGroup;
}

// Main test function
export default function (data) {
    authToken = data.authToken;
    userId = data.userId;

    group('API - Authentication Endpoints', () => {
        // Test GetMe endpoint
        const getMeRes = http.get(`${BASE_URL}/api/v1/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });

        const meSuccess = check(getMeRes, {
            'GET /auth/me status is 200': (r) => r.status === 200,
            'GET /auth/me response time < 200ms': (r) => r.timings.duration < 200,
        });

        if (!meSuccess) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(getMeRes.timings.duration);
    });

    group('API - Checkpoint Endpoints', () => {
        // Get all checkpoints
        const checkpointRes = http.get(`${BASE_URL}/api/v1/checkpoints`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const checkpointSuccess = check(checkpointRes, {
            'GET /checkpoints status is 200': (r) => r.status === 200,
            'GET /checkpoints response time < 300ms': (r) => r.timings.duration < 300,
            'GET /checkpoints returns data': (r) => r.body.includes('data'),
        });

        if (!checkpointSuccess) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(checkpointRes.timings.duration);

        // Get specific checkpoint
        const checkpointDetailRes = http.get(`${BASE_URL}/api/v1/checkpoints/1`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const detailSuccess = check(checkpointDetailRes, {
            'GET /checkpoints/:id status is 200 or 404': (r) => r.status === 200 || r.status === 404,
            'GET /checkpoints/:id response time < 200ms': (r) => r.timings.duration < 200,
        });

        if (!detailSuccess) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(checkpointDetailRes.timings.duration);

        // Get checkpoint status
        const statusRes = http.get(`${BASE_URL}/api/v1/checkpoints/1/status`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const statusSuccess = check(statusRes, {
            'GET /checkpoints/:id/status is 200 or 404': (r) => r.status === 200 || r.status === 404,
            'GET /checkpoints/:id/status response time < 200ms': (r) => r.timings.duration < 200,
        });

        if (!statusSuccess) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(statusRes.timings.duration);
    });

    group('API - Route Estimation Endpoints', () => {
        // Estimate route
        const estimateRes = http.get(
            `${BASE_URL}/api/v1/routes/estimate?sourceLat=31.9454&sourceLon=35.2338&destLat=31.9564&destLon=35.1978`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const estimateSuccess = check(estimateRes, {
            'GET /routes/estimate status is 200': (r) => r.status === 200,
            'GET /routes/estimate response time < 500ms': (r) => r.timings.duration < 500,
            'GET /routes/estimate contains route data': (r) => r.body.includes('distance'),
        });

        if (!estimateSuccess) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(estimateRes.timings.duration);

        // Analyze route
        const analyzeRes = http.get(
            `${BASE_URL}/api/v1/routes/analyze?sourceLat=31.9454&sourceLon=35.2338&destLat=31.9564&destLon=35.1978`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const analyzeSuccess = check(analyzeRes, {
            'GET /routes/analyze status is 200': (r) => r.status === 200,
            'GET /routes/analyze response time < 600ms': (r) => r.timings.duration < 600,
        });

        if (!analyzeSuccess) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(analyzeRes.timings.duration);

        // Get safe corridors
        const corridorRes = http.get(`${BASE_URL}/api/v1/routes/safe-corridors`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const corridorSuccess = check(corridorRes, {
            'GET /routes/safe-corridors status is 200': (r) => r.status === 200,
            'GET /routes/safe-corridors response time < 400ms': (r) => r.timings.duration < 400,
        });

        if (!corridorSuccess) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(corridorRes.timings.duration);

        // Get cache status
        const cacheRes = http.get(`${BASE_URL}/api/v1/routes/cache-status`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const cacheSuccess = check(cacheRes, {
            'GET /routes/cache-status status is 200': (r) => r.status === 200,
            'GET /routes/cache-status response time < 200ms': (r) => r.timings.duration < 200,
        });

        if (!cacheSuccess) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(cacheRes.timings.duration);
    });

    // Random sleep between requests
    sleep(__ENV.SLEEP_DURATION ? parseInt(__ENV.SLEEP_DURATION) : 2);
}

// Cleanup if needed
export function teardown(data) {
    console.log('Load test completed');
}
