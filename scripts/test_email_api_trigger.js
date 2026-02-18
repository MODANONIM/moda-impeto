const API_URL = 'http://localhost:3000/api';
const USER_EMAIL = `test_ship_${Date.now()}@example.com`;
const USER_PASS = 'password123';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'password123'; // Assuming default

async function request(url, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    return { status: res.status, data };
}

async function runTest() {
    try {
        console.log('1. Registering User...');
        await request(`${API_URL}/auth/register`, 'POST', { firstName: 'Test', lastName: 'User', email: USER_EMAIL, password: USER_PASS });
        const loginUser = await request(`${API_URL}/auth/user-login`, 'POST', { email: USER_EMAIL, password: USER_PASS });
        const userToken = loginUser.data.token;
        console.log('   User logged in.');

        console.log('2. Creating Order...');
        const orderRes = await request(`${API_URL}/orders`, 'POST', {
            items: [{ productId: '1', quantity: 1, price: 1000 }],
            totalAmount: 1000,
            paymentMethod: 'stripe',
            customer: { firstName: 'Test', lastName: 'User', email: USER_EMAIL }
        }, userToken);
        const orderId = orderRes.data._id; // We need _id for PUT /orders/:id/status
        console.log(`   Order Created. _id: ${orderId}`);

        console.log('3. Logging in as Admin...');
        const loginAdmin = await request(`${API_URL}/auth/login`, 'POST', { username: ADMIN_USER, password: ADMIN_PASS });
        if (loginAdmin.status !== 200) {
            throw new Error('Admin login failed: ' + JSON.stringify(loginAdmin.data));
        }
        const adminToken = loginAdmin.data.token;
        console.log('   Admin logged in.');

        console.log('4. Updating Status to Shipped...');
        const updateRes = await request(`${API_URL}/orders/${orderId}/status`, 'PUT', { status: 'Shipped' }, adminToken);

        if (updateRes.status === 200 && updateRes.data.status === 'Shipped') {
            console.log('SUCCESS: Order status updated to Shipped.');
            console.log('   (Check server logs for email output)');
        } else {
            console.error('FAILURE: Update failed', updateRes.data);
            process.exit(1);
        }

    } catch (err) {
        console.error('TEST ERROR:', err);
        process.exit(1);
    }
}

runTest();
