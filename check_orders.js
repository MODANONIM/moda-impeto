require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/moda_impeto?directConnection=true';

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('Connected to DB');
        const orders = await Order.find({});
        console.log(`Found ${orders.length} orders.`);
        orders.forEach(o => {
            console.log(`Order ${o.orderId}: ${o.customer.email}`);
        });

        const User = require('./models/User');
        const users = await User.find({ email: 'mr.thursday.official@gmail.com' });
        console.log(`Found ${users.length} users with mr.thursday.official@gmail.com`);
        if (users.length > 0) {
            console.log('User found:', users[0]);
        }
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
