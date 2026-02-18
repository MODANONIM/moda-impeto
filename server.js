require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const basicAuth = require('express-basic-auth');

// MongoDB Connection
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/moda_impeto')
    .then(() => {
        console.log('MongoDB Connected');
        seedAdmin();
    })
    .catch(err => console.error('MongoDB Connection Error:', err));



app.use(helmet({
    contentSecurityPolicy: false, // Disabled for simplicity with external scripts (Stripe/PayPal)
}));
app.use(cors());

// Basic Auth for Admin Routes
// Basic Auth for Admin Routes
const adminAuth = basicAuth({
    users: { [process.env.BASIC_AUTH_USER || 'admin']: process.env.BASIC_AUTH_PASS || 'supersecret' },
    challenge: true,
    realm: 'Moda Impeto Admin Area'
});

const adminPaths = [
    '/admin',
    '/admin.html',
    '/orders.html',
    '/inventory.html',
    '/admin_users.html'
];

app.use(adminPaths, adminAuth);

app.use(express.json());
app.use(express.static(__dirname));

// Routes
const apiRoutes = require('./routes/api');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api', uploadRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

async function seedAdmin() {
    try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            console.log('No admin found. Seeding default admin...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            const admin = new Admin({
                username: 'admin',
                password: hashedPassword
            });
            await admin.save();
            console.log('Default admin created: admin / password123');
        } else {
            console.log('Admin already exists. Skipping seed.');
        }
    } catch (err) {
        console.error('Admin seeding failed:', err);
    }
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
