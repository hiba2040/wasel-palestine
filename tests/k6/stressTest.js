/**
 * k6 Stress Test Script
 * Gradually increases load to find breaking point
 * 
 * Run: k6 run tests/k6/stressTest.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('stress_errors');
const responseTime = new Trend('stress_response_time');
const successfulRequests = new Counter('stress_successful_requests');
const failedRequests = new Counter('stress_failed_requests');

// Stress testing configuration
export const options = {
    stages: [
        // Start with 100 VUs
        { duration: '2m', target: 100 },
        // Ramp up by 50 VUs every 30 seconds until response times degrade
        { duration: '30s', target: 150 },
        { duration: '30s', target: 200 },
        { duration: '30s', target: 250 },
        { duration: '30s', target: 300 },
        { duration: '30s', target: 350 },
        // Hold at high load
        { duration: '2m', target: 350 },
        // Ramp down
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        'stress_response_time': ['p(95)<1000', 'p(99)<2000'], // More lenient for stress test
        'stress_errors': ['rate<0.2'], // Allow up to 20% errors during stress
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
let authToken = '';

export function setup() {
    const uniqueEmail = `stresstest_${Date.now()}@test.com`;
    
    const registerRes = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify({
        name: 'Stress Test User',
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
    return {
        authToken: loginData.data?.accessToken || '',
    };
}

export default function (data) {
    authToken = data.authToken;

    // Test authenticated endpoints under stress
    group('Stress - Authenticated Endpoints', () => {
        const getMeRes = http.get(`${BASE_URL}/api/v1/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });

        const success = check(getMeRes, {
            'status is 200': (r) => r.status === 200,
        });

        if (!success) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(getMeRes.timings.duration);
    });

    // Test public endpoints under stress
    group('Stress - Public Endpoints', () => {
        const checkpointRes = http.get(`${BASE_URL}/api/v1/checkpoints?page=1&limit=10`, {
            headers: { 'Content-Type': 'application/json' },
        });

        const success = check(checkpointRes, {
            'status is 200': (r) => r.status === 200,
        });

        if (!success) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(checkpointRes.timings.duration);
    });

    // Test route estimation under stress
    group('Stress - Route Estimation', () => {
        const routeRes = http.get(
            `${BASE_URL}/api/v1/routes/estimate?sourceLat=31.9454&sourceLon=35.2338&destLat=31.9564&destLon=35.1978`,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const success = check(routeRes, {
            'status is 200': (r) => r.status === 200,
        });

        if (!success) {
            errorRate.add(1);
            failedRequests.add(1);
        } else {
            successfulRequests.add(1);
        }

        responseTime.add(routeRes.timings.duration);
    });

    sleep(1);
}

export function teardown(data) {
    console.log('Stress test completed');
}
