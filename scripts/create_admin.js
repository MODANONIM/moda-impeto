const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Admin = require('../models/Admin');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/moda_impeto';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');

        const username = 'admin';
        const password = 'password123';

        let admin = await Admin.findOne({ username });
        if (admin) {
            console.log('Admin already exists. Updating password...');
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(password, salt);
            await admin.save();
            console.log('Admin password updated.');
        } else {
            console.log('Creating new admin...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            admin = new Admin({
                username,
                password: hashedPassword
            });
            await admin.save();
            console.log('Admin created.');
        }

        mongoose.disconnect();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
