require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for simplicity with external scripts (Stripe/PayPal)
}));
app.use(cors());

// Stripe webhook needs raw body for signature verification
// This must be before express.json() middleware
app.use('/api/webhook', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Database Connection
// Use environment variable for MongoDB connection, fallback to local DB for development
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/moda_impeto?directConnection=true';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('MongoDB Connected');
        // Create Default Admin
        const Admin = require('./models/Admin');
        const bcrypt = require('bcryptjs');
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            const newAdmin = new Admin({ username: 'admin', password: hashedPassword });
            await newAdmin.save();
            console.log('Default Admin Created (admin / admin123)');
        }
    })
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
const apiRoutes = require('./routes/api');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api', uploadRoutes);
app.use('/api', paymentRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
