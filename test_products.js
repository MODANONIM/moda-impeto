const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/moda_impeto')
    .then(async () => {
        console.log('Connected to DB');
        try {
            const products = await Product.find().sort({ id: 1 });
            console.log(`Found ${products.length} products`);
            products.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));
        } catch (e) {
            console.error('Error finding products:', e);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => console.error('Connect Error:', err));
