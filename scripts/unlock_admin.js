const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function unlockAdmin() {
    try {
        // Connect to DB
        // Use environment variable or default local connection
        const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/moda_impeto?directConnection=true';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('Connected.');

        const username = process.argv[2] || 'admin';

        console.log(`Attempting to unlock admin user: "${username}"...`);

        const result = await Admin.updateOne(
            { username: username },
            {
                $set: { loginAttempts: 0 },
                $unset: { lockUntil: 1 }
            }
        );

        if (result.matchedCount === 0) {
            console.log(`❌ User "${username}" not found.`);
        } else if (result.modifiedCount === 0) {
            console.log(`ℹ️ User "${username}" was not locked or already unlocked.`);
        } else {
            console.log(`✅ User "${username}" has been successfully unlocked!`);
            console.log('   Login attempts reset to 0.');
            console.log('   Lock removed.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

unlockAdmin();
