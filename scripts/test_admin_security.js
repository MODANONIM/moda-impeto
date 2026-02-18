const mongoose = require('mongoose');
const Admin = require('../models/Admin');
// Node 18+ has native fetch support
// const request = require('node-fetch');

const API_URL = 'http://localhost:3000/api/auth/login';

async function testLogin(username, password, secretCode) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, secretCode })
    });
    const data = await res.json();
    return { status: res.status, data };
}

async function runTest() {
    console.log('--- Starting Admin Security Test ---');

    // 1. Reset Admin State (Direct DB Access)
    // We need to connect to DB to reset the admin for testing
    require('dotenv').config();
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/moda_impeto?directConnection=true';
    await mongoose.connect(mongoURI);

    // Debug: Check if admin exists and reset
    const admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
        console.error('CRITICAL: Admin user "admin" not found in DB!');
        process.exit(1);
    }

    // Force reset using save() or updateMany - including Password reset to 'admin123'
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);

    await Admin.updateMany({ username: 'admin' }, {
        $set: {
            loginAttempts: 0,
            password: hash
        },
        $unset: { lockUntil: 1 }
    });
    console.log('1. Admin account reset (pass=admin123). Current state:', await Admin.findOne({ username: 'admin' }));

    // 2. Test Missing/Wrong Secret Code
    console.log('\n2. Test: Login with WRONG Secret Code');
    const res1 = await testLogin('admin', 'admin123', 'wrongcode'); // Assuming 'admin123' is correct pass
    if (res1.status === 400 && res1.data.message === 'Invalid credentials') {
        console.log('   PASS: Rejected wrong secret code.');
    } else {
        console.error('   FAIL:', res1.status, res1.data);
    }

    // 3. Test Lockout Logic (6 failures)
    console.log('\n3. Test: Trigger Lockout (6 failures)');
    for (let i = 1; i <= 6; i++) {
        const res = await testLogin('admin', 'wrongpass', 'admin123');
        console.log(`   Attempt ${i}: Status ${res.status}`);
    }

    // 4. Test Login WHILE Locked (Even with correct credentials)
    console.log('\n4. Test: Login while Locked (Correct Credentials)');
    const resLocked = await testLogin('admin', 'admin123', 'admin123'); // Assuming 'admin123' is pass
    if (resLocked.status === 403 && resLocked.data.message.includes('locked')) {
        console.log('   PASS: Account is locked.');
    } else {
        console.error('   FAIL: Account should be locked.', resLocked.status, resLocked.data);
    }

    // 5. Manual Unlock & Success
    console.log('\n5. Test: Manual Unlock & Success');
    // Using $unset to completely remove the field is safer than undefined
    await Admin.updateOne({ username: 'admin' }, { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });

    // Tiny delay to ensure DB write propagation if needed
    await new Promise(r => setTimeout(r, 500));
    const resSuccess = await testLogin('admin', 'admin123', 'admin123');
    if (resSuccess.status === 200 && resSuccess.data.token) {
        console.log('   PASS: Login successful after unlock.');
    } else {
        console.error('   FAIL:', resSuccess.status, resSuccess.data);
    }

    await mongoose.disconnect();
}

runTest().catch(console.error);
