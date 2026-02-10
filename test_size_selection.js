

const API_URL = 'http://localhost:3000/api';
let adminToken = '';
let productId = '';
let orderId = '';

async function run() {
    try {
        console.log('--- Step 1: Admin Login ---');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error('Login failed: ' + loginData.message);
        adminToken = loginData.token;
        console.log('Admin Token obtained.');

        console.log('\n--- Step 2: Create Product with Sizes ---');
        const productData = {
            name: 'Test Size Product',
            price: 5000,
            description: 'Testing sizes',
            category: 'Test',
            image: 'http://example.com/image.jpg',
            sizes: ['S', 'M', 'L']
        };
        const createRes = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(productData)
        });
        const createdProduct = await createRes.json();
        if (!createRes.ok) throw new Error('Create product failed: ' + createdProduct.message);
        productId = createdProduct._id;
        console.log('Product created:', productId, 'Sizes:', createdProduct.sizes);

        if (!createdProduct.sizes || !createdProduct.sizes.includes('M')) {
            throw new Error('Product sizes not saved correctly');
        }

        console.log('\n--- Step 3: Place Order with Size ---');
        const orderData = {
            customer: {
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                address: '123 Test St',
                city: 'Test City',
                zipCode: '12345',
                country: 'Test Country'
            },
            items: [
                {
                    productId: productId,
                    name: 'Test Size Product',
                    price: 5000,
                    quantity: 1,
                    image: 'http://example.com/image.jpg',
                    size: 'M'
                }
            ],
            totalAmount: 5000,
            paymentMethod: 'Credit Card'
        };

        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const orderResult = await orderRes.json();
        if (!orderRes.ok) throw new Error('Order creation failed: ' + orderResult.message);
        orderId = orderResult.orderId; // API returns { message, orderId }
        console.log('Order placed:', orderId);

        console.log('\n--- Step 4: Verify Order via Admin API ---');
        const ordersRes = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const orders = await ordersRes.json();
        if (!ordersRes.ok) throw new Error('Fetch orders failed');

        // Find the specific order. Note: The API might return orders sorted differently or paginated.
        // Assuming it returns all or recent orders.
        const myOrder = orders.find(o => o.customer.email === 'test@example.com' && o.items[0].productId === productId);

        if (!myOrder) {
            // It might be that orderId returned is not the full object, let's find by ID if possible
            const found = orders.find(o => o._id === orderId);
            if (found) {
                console.log('Order found by ID');
                if (found.items[0].size === 'M') {
                    console.log('SUCCESS: Order item has correct size "M"');
                } else {
                    throw new Error(`Order item size mismatch. Expected "M", got "${found.items[0].size}"`);
                }
            } else {
                throw new Error('Order not found in admin list');
            }
        } else {
            console.log('Order found by details');
            if (myOrder.items[0].size === 'M') {
                console.log('SUCCESS: Order item has correct size "M"');
            } else {
                throw new Error(`Order item size mismatch. Expected "M", got "${myOrder.items[0].size}"`);
            }
        }

        console.log('\n--- Step 5: Cleanup Skipped for Browser Check ---');
        // const deleteRes = await fetch(`${API_URL}/products/${productId}`, {
        //     method: 'DELETE',
        //     headers: { 'Authorization': `Bearer ${adminToken}` }
        // });
        // if(deleteRes.ok) console.log('Test product deleted');

    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exit(1);
    }
}

run();
