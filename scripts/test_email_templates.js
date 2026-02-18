const { sendOrderConfirmation, sendOrderShipped } = require('../utils/email');

const mockOrder = {
    orderId: 'ORD-TEST-12345',
    createdAt: new Date(),
    status: 'Processing',
    totalAmount: 15000,
    customer: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        address: '1-2-3 Test St',
        city: 'Test City',
        zipCode: '123-4567'
    },
    items: [
        {
            name: 'IMPETO Leather Jacket',
            image: 'https://placehold.co/100',
            size: 'M',
            quantity: 1,
            price: 15000
        }
    ]
};

async function runTest() {
    console.log('TEST 1: Order Confirmation Email');
    await sendOrderConfirmation(mockOrder, mockOrder.customer.email);

    console.log('\nTEST 2: Order Shipped Email');
    mockOrder.status = 'Shipped';
    await sendOrderShipped(mockOrder, mockOrder.customer.email);
}

runTest();
