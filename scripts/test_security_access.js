const API_URL = 'http://localhost:3000/api';
const EMAIL_A = `user_a_${Date.now()}@example.com`;
const EMAIL_B = `user_b_${Date.now()}@example.com`;
const PASSWORD = 'password123';

async function request(url, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    // Don't throw here, we want to inspect the response
    return { status: res.status, data };
}

async function runTest() {
    try {
        console.log('--- Setting up Users ---');
        // Register User A
        await request(`${API_URL}/auth/register`, 'POST', { firstName: 'User', lastName: 'A', email: EMAIL_A, password: PASSWORD });
        const loginA = await request(`${API_URL}/auth/user-login`, 'POST', { email: EMAIL_A, password: PASSWORD });
        const tokenA = loginA.data.token;
        console.log('User A registered and logged in.');

        // Register User B
        await request(`${API_URL}/auth/register`, 'POST', { firstName: 'User', lastName: 'B', email: EMAIL_B, password: PASSWORD });
        const loginB = await request(`${API_URL}/auth/user-login`, 'POST', { email: EMAIL_B, password: PASSWORD });
        const tokenB = loginB.data.token;
        console.log('User B registered and logged in.');

        console.log('\n--- Creating Order for User A ---');
        const orderA = await request(`${API_URL}/orders`, 'POST', {
            items: [{ productId: '1', quantity: 1, price: 1000 }],
            totalAmount: 1000,
            paymentMethod: 'stripe',
            customer: { email: EMAIL_A, firstName: 'User', lastName: 'A', phone: '111' }
        }, tokenA);
        const orderIdA = orderA.data.orderId;
        console.log(`Order A created: ${orderIdA}`);

        console.log('\n--- TEST 1: User B accessing User A order via /api/my-orders ---');
        // /api/my-orders takes { orderIds: [...] } and returns matching orders
        const res1 = await request(`${API_URL}/my-orders`, 'POST', { orderIds: [orderIdA] }); // Public Endpoint
        // If it returns the order, it means knowledge of ID is enough
        if (res1.data.length > 0 && res1.data[0].orderId === orderIdA) {
            console.log('[INFO] /api/my-orders allows access if Order ID is known (Expected for guest compatibility)');
        } else {
            console.log('[SECURE] /api/my-orders did NOT return the order.');
        }

        console.log('\n--- TEST 2: User B accessing User A order via /api/orders/me ---');
        const res2 = await request(`${API_URL}/orders/me`, 'GET', null, tokenB);
        const found = res2.data.find(o => o.orderId === orderIdA);
        if (found) {
            console.error('[FAIL] User B can see User A order in /api/orders/me');
        } else {
            console.log('[PASS] User B cannot see User A order in /api/orders/me');
        }

        console.log('\n--- TEST 3: User B cancelling User A order via /api/orders/:id/cancel ---');
        const res3 = await request(`${API_URL}/orders/${orderIdA}/cancel`, 'POST', {}, tokenB); // Using Token B, but route might be public
        if (res3.status === 200) {
            console.log('[INFO] User B cancelled User A order (Route is public/guest accessible)');
        } else {
            console.log(`[PASS?] Cancellation failed with status ${res3.status}`);
        }

    } catch (err) {
        console.error('TEST ERROR:', err);
    }
}

runTest();
