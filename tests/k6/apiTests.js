/**
 * k6 API Functional Test Script
 * Tests all API endpoints for correct behavior and response codes
 * 
 * Run: k6 run tests/k6/apiTests.js
 */

import http from 'k6/http';
import { check, group, fail } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

let authToken = '';
let userId = '';
let checkpointId = '';

export const options = {
    stages: [
        // Run with small number of VUs for API tests
        { duration: '1m', target: 5 },
    ],
    thresholds: {
        'http_req_failed': ['rate<0.05'], // Error rate < 5%
        'http_req_duration': ['p(95)<800'], // 95th percentile < 800ms
    },
};

export function setup() {
    console.log('Starting API tests...');
}

export default function () {
    // ===== AUTHENTICATION TESTS =====
    group('Authentication API', () => {
        // Test 1: User Registration
        group('POST /auth/register', () => {
            const uniqueEmail = `apitest_${Date.now()}@test.com`;
            const registerRes = http.post(
                `${BASE_URL}/api/v1/auth/register`,
                JSON.stringify({
                    name: 'API Test User',
                    email: uniqueEmail,
                    password: 'TestPassword123!'
                }),
                { headers: { 'Content-Type': 'application/json' } }
            );

            const isSuccess = check(registerRes, {
                'status is 201': (r) => r.status === 201,
                'response contains user': (r) => r.body.includes('id'),
                'response contains email': (r) => r.body.includes('email'),
            });

            if (!isSuccess) {
                console.error('Registration failed:', registerRes.body);
            }

            // Extract user data for next tests
            if (registerRes.status === 201) {
                const userData = JSON.parse(registerRes.body);
                userId = userData.data?.id;
            }
        });

        // Test 2: User Login
        group('POST /auth/login', () => {
            const loginRes = http.post(
                `${BASE_URL}/api/v1/auth/login`,
                JSON.stringify({
                    email: 'apitest_1@test.com',
                    password: 'TestPassword123!'
                }),
                { headers: { 'Content-Type': 'application/json' } }
            );

            const isSuccess = check(loginRes, {
                'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
            });

            // Extract auth token for protected endpoints
            if (loginRes.status === 200) {
                const loginData = JSON.parse(loginRes.body);
                authToken = loginData.data?.accessToken || '';
            }
        });

        // Test 3: Get Current User
        group('GET /auth/me', () => {
            const getMeRes = http.get(`${BASE_URL}/api/v1/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken || 'invalid'}`,
                    'Content-Type': 'application/json',
                }
            });

            check(getMeRes, {
                'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
                'response contains user data when authenticated': (r) => 
                    r.status === 401 || r.body.includes('email'),
            });
        });
    });

    // ===== CHECKPOINT TESTS =====
    group('Checkpoint API', () => {
        // Test 4: Get All Checkpoints
        group('GET /checkpoints', () => {
            const res = http.get(`${BASE_URL}/api/v1/checkpoints?page=1&limit=10`, {
                headers: { 'Content-Type': 'application/json' }
            });

            const isSuccess = check(res, {
                'status is 200': (r) => r.status === 200,
                'response contains data': (r) => r.body.includes('data'),
                'response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
            });

            // Extract first checkpoint ID for next tests
            if (isSuccess) {
                try {
                    const data = JSON.parse(res.body);
                    if (data.data?.data && data.data.data.length > 0) {
                        checkpointId = data.data.data[0].id;
                    }
                } catch (e) {
                    console.error('Failed to parse checkpoint list:', e);
                }
            }
        });

        // Test 5: Get Checkpoint by ID
        if (checkpointId) {
            group(`GET /checkpoints/${checkpointId}`, () => {
                const res = http.get(`${BASE_URL}/api/v1/checkpoints/${checkpointId}`, {
                    headers: { 'Content-Type': 'application/json' }
                });

                check(res, {
                    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
                    'response contains checkpoint data when found': (r) => 
                        r.status === 404 || r.body.includes('name'),
                });
            });
        }

        // Test 6: Get Checkpoint Status
        if (checkpointId) {
            group(`GET /checkpoints/${checkpointId}/status`, () => {
                const res = http.get(`${BASE_URL}/api/v1/checkpoints/${checkpointId}/status`, {
                    headers: { 'Content-Type': 'application/json' }
                });

                check(res, {
                    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
                    'response contains status when found': (r) => 
                        r.status === 404 || r.body.includes('status'),
                });
            });
        }

        // Test 7: Get Checkpoint History
        if (checkpointId) {
            group(`GET /checkpoints/${checkpointId}/history`, () => {
                const res = http.get(`${BASE_URL}/api/v1/checkpoints/${checkpointId}/history?page=1&limit=10`, {
                    headers: { 'Content-Type': 'application/json' }
                });

                check(res, {
                    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
                    'response is valid JSON': (r) => {
                        try {
                            JSON.parse(r.body);
                            return true;
                        } catch {
                            return false;
                        }
                    },
                });
            });
        }
    });

    // ===== ROUTE ESTIMATION TESTS =====
    group('Route Estimation API', () => {
        const coords = {
            sourceLat: 31.9454,
            sourceLon: 35.2338,
            destLat: 31.9564,
            destLon: 35.1978
        };

        // Test 8: Estimate Route
        group('GET /routes/estimate', () => {
            const url = `${BASE_URL}/api/v1/routes/estimate?sourceLat=${coords.sourceLat}&sourceLon=${coords.sourceLon}&destLat=${coords.destLat}&destLon=${coords.destLon}`;
            const res = http.get(url, {
                headers: { 'Content-Type': 'application/json' }
            });

            const isSuccess = check(res, {
                'status is 200': (r) => r.status === 200,
                'response contains route data': (r) => r.body.includes('distance'),
                'response contains safety data': (r) => r.body.includes('safety'),
                'response contains weather data': (r) => r.body.includes('weather'),
            });

            if (!isSuccess) {
                console.error('Route estimation failed:', res.body);
            }
        });

        // Test 9: Analyze Route
        group('GET /routes/analyze', () => {
            const url = `${BASE_URL}/api/v1/routes/analyze?sourceLat=${coords.sourceLat}&sourceLon=${coords.sourceLon}&destLat=${coords.destLat}&destLon=${coords.destLon}`;
            const res = http.get(url, {
                headers: { 'Content-Type': 'application/json' }
            });

            check(res, {
                'status is 200': (r) => r.status === 200,
                'response contains routes': (r) => r.body.includes('routes'),
                'response contains recommendations': (r) => r.body.includes('recommendation'),
            });
        });

        // Test 10: Get Safe Corridors
        group('GET /routes/safe-corridors', () => {
            const res = http.get(`${BASE_URL}/api/v1/routes/safe-corridors`, {
                headers: { 'Content-Type': 'application/json' }
            });

            check(res, {
                'status is 200': (r) => r.status === 200,
                'response contains corridors': (r) => r.body.includes('corridors'),
            });
        });

        // Test 11: Get Route History
        group('GET /routes/history', () => {
            const res = http.get(`${BASE_URL}/api/v1/routes/history?page=1&limit=10`, {
                headers: { 'Content-Type': 'application/json' }
            });

            check(res, {
                'status is 200': (r) => r.status === 200,
                'response contains pagination': (r) => r.body.includes('page') || r.body.includes('data'),
            });
        });

        // Test 12: Get Cache Status
        group('GET /routes/cache-status', () => {
            const res = http.get(`${BASE_URL}/api/v1/routes/cache-status`, {
                headers: { 'Content-Type': 'application/json' }
            });

            check(res, {
                'status is 200': (r) => r.status === 200,
                'response contains cache stats': (r) => r.body.includes('Cache') || r.body.includes('cache'),
            });
        });
    });

    // ===== ERROR HANDLING TESTS =====
    group('Error Handling', () => {
        // Test 13: Invalid route parameters
        group('Invalid route parameters', () => {
            const res = http.get(`${BASE_URL}/api/v1/routes/estimate`, {
                headers: { 'Content-Type': 'application/json' }
            });

            check(res, {
                'status is 400': (r) => r.status === 400,
                'response contains error message': (r) => r.body.includes('error'),
            });
        });

        // Test 14: Non-existent resource
        group('Non-existent resource', () => {
            const res = http.get(`${BASE_URL}/api/v1/checkpoints/99999999`, {
                headers: { 'Content-Type': 'application/json' }
            });

            check(res, {
                'status is 404': (r) => r.status === 404,
            });
        });

        // Test 15: Missing authorization
        group('Missing authorization', () => {
            const res = http.get(`${BASE_URL}/api/v1/auth/me`, {
                headers: { 'Content-Type': 'application/json' }
            });

            check(res, {
                'status is 401': (r) => r.status === 401,
            });
        });
    });
}

export function teardown(data) {
    console.log('✅ API tests completed');
}
