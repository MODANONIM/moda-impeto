
const API_URL = 'http://localhost:3000/api';
let adminToken = '';
const productId = '698857f928ac7eb89fa547cd';

async function cleanup() {
    try {
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        adminToken = loginData.token;

        const deleteRes = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (deleteRes.ok) console.log('Test product deleted');
        else console.error('Failed to delete product', await deleteRes.json());
    } catch (err) {
        console.error(err);
    }
}
cleanup();
