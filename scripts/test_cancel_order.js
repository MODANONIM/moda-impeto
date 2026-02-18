const API_URL = 'http://localhost:3000/api';
const EMAIL = `test_cancel_${Date.now()}@example.com`;
const PASSWORD = 'password123';

async function request(url, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message || res.statusText);
    }
    return data;
}

async function runTest() {
    try {
        console.log('1. Registering user...');
        await request(`${API_URL}/auth/register`, 'POST', {
            firstName: 'Test',
            lastName: 'User',
            email: EMAIL,
            password: PASSWORD
        });
        console.log('   User registered.');

        console.log('2. Logging in...');
        const loginData = await request(`${API_URL}/auth/user-login`, 'POST', {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginData.token;
        console.log('   Logged in. Token received.');

        console.log('3. Creating Order...');
        const orderData = await request(`${API_URL}/orders`, 'POST', {
            items: [{ productId: '1', quantity: 1, price: 1000 }],
            totalAmount: 1000,
            paymentMethod: 'stripe',
            customer: {
                email: EMAIL,
                firstName: 'Test',
                lastName: 'User',
                phone: '09012345678'
            }
        }, token);
        const orderId = orderData.orderId; // API returns orderId
        console.log(`   Order created. ID: ${orderId}`);

        console.log('4. Cancelling Order...');
        await request(`${API_URL}/orders/${orderId}/cancel`, 'POST', {}, token);
        console.log('   Cancel request sent.');

        console.log('5. Verifying Status...');
        const history = await request(`${API_URL}/orders/me`, 'GET', null, token);

        const cancelledOrder = history.find(o => o.orderId === orderId);
        if (cancelledOrder && cancelledOrder.status === 'Cancelled') {
            console.log('SUCCESS: Order status is Cancelled.');
        } else {
            console.error('FAILURE: Order status is ' + (cancelledOrder ? cancelledOrder.status : 'NOT FOUND'));
            process.exit(1);
        }

    } catch (err) {
        console.error('TEST FAILED:', err.message);
        process.exit(1);
    }
}

runTest();
