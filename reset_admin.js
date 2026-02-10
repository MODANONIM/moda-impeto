const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/moda_impeto?directConnection=true');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const resetAdmin = async () => {
    await connectDB();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    let admin = await Admin.findOne({ username: 'admin' });
    if (admin) {
        admin.password = hashedPassword;
        await admin.save();
        console.log('Admin password reset to: admin123');
    } else {
        admin = new Admin({
            username: 'admin',
            password: hashedPassword
        });
        await admin.save();
        console.log('Admin created with password: admin123');
    }
    process.exit();
};

resetAdmin();
