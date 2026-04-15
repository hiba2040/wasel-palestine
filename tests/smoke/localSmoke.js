const axios = require('axios');
const app = require('../../app');
const { User } = require('../../src/models');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const baseURL = 'http://127.0.0.1:3000';

const run = async () => {
    await sleep(8000);

    const root = await axios.get(`${baseURL}/`);

    const email = `smoke_${Date.now()}@test.com`;
    const password = 'Pass123456!';

    await axios.post(`${baseURL}/api/v1/auth/register`, {
        name: 'Smoke User',
        email,
        password
    });

    await User.update({ role: 'admin' }, { where: { email } });

    const login = await axios.post(`${baseURL}/api/v1/auth/login`, {
        email,
        password
    });

    const accessToken = login.data.accessToken;
    const refreshToken = login.data.refreshToken;

    const authHeaders = {
        Authorization: `Bearer ${accessToken}`
    };

    const me = await axios.get(`${baseURL}/api/v1/auth/me`, {
        headers: authHeaders
    });

    await axios.post(`${baseURL}/api/v1/auth/refresh-token`, { refreshToken });

    const createCheckpoint = await axios.post(
        `${baseURL}/api/v1/checkpoints`,
        {
            name: 'Smoke Checkpoint',
            latitude: 31.95,
            longitude: 35.22,
            region: 'Ramallah',
            status: 'open',
            description: 'smoke test checkpoint'
        },
        { headers: authHeaders }
    );

    const checkpointId = createCheckpoint.data.data.id;

    await axios.get(`${baseURL}/api/v1/checkpoints`);
    await axios.get(`${baseURL}/api/v1/checkpoints/${checkpointId}`);
    await axios.get(`${baseURL}/api/v1/checkpoints/${checkpointId}/status`);

    await axios.put(
        `${baseURL}/api/v1/checkpoints/${checkpointId}`,
        {
            name: 'Smoke Checkpoint Updated',
            latitude: 31.951,
            longitude: 35.221,
            region: 'Ramallah',
            description: 'updated in smoke test'
        },
        { headers: authHeaders }
    );

    await axios.post(
        `${baseURL}/api/v1/checkpoints/${checkpointId}/status`,
        {
            status: 'restricted',
            note: 'temporary restriction'
        },
        { headers: authHeaders }
    );

    await axios.get(`${baseURL}/api/v1/checkpoints/${checkpointId}/history`);

    const routeEstimate = await axios.get(
        `${baseURL}/api/v1/routes/estimate?sourceLat=31.9454&sourceLon=35.2338&destLat=31.9564&destLon=35.1978`
    );
    await axios.get(
        `${baseURL}/api/v1/routes/analyze?sourceLat=31.9454&sourceLon=35.2338&destLat=31.9564&destLon=35.1978`
    );
    await axios.get(`${baseURL}/api/v1/routes/safe-corridors`);
    await axios.get(`${baseURL}/api/v1/routes/history`);
    await axios.get(`${baseURL}/api/v1/routes/cache-status`);

    await axios.delete(`${baseURL}/api/v1/checkpoints/${checkpointId}`, {
        headers: authHeaders
    });

    console.log(
        JSON.stringify(
            {
                ok: true,
                message: 'Smoke test passed',
                rootMessage: root.data.message,
                userRole: me.data.role,
                sampleRouteDistance: routeEstimate.data.data.route.distance,
                sampleSafetyScore: routeEstimate.data.data.safety.score
            },
            null,
            2
        )
    );
};

run()
    .catch((error) => {
        const details = error.response ? error.response.data : error.message;
        console.error('Smoke test failed:', details);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            const { sequelize } = require('../../src/models');
            await sequelize.close();
        } catch (_err) {
            // noop
        }
        process.exit();
    });
