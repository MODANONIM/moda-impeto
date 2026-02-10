const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const auth = require('../middleware/auth');

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secretKey', { expiresIn: '24h' });
        res.json({ token, user: { id: admin._id, username: admin.username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// CHANGE PASSWORD
router.post('/change-password', auth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const admin = await Admin.findById(req.user.id);

        const isMatch = await bcrypt.compare(oldPassword, admin.password);
        if (!isMatch) return res.status(400).json({ message: 'Incorrect old password' });

        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);
        await admin.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REFRESH TOKEN - Get a new token using valid existing token
router.post('/refresh', auth, async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Issue new token with fresh expiration (24h)
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secretKey', { expiresIn: '24h' });
        res.json({ token, user: { id: admin._id, username: admin.username } });
    } catch (err) {
        console.error('Token refresh error:', err);
        res.status(500).json({ error: err.message });
    }
});

// VERIFY TOKEN - Check if current token is valid and get time remaining
router.get('/verify', auth, async (req, res) => {
    try {
        // Decode token to get expiration time
        const token = req.header('Authorization')?.replace('Bearer ', '');
        const decoded = jwt.decode(token);

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now; // seconds until expiration

        res.json({
            valid: true,
            expiresIn: expiresIn,
            expiresAt: new Date(decoded.exp * 1000).toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Customer Auth Routes
// ==========================================

// POST /api/auth/register - Register new customer
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, address, apartment, city, zipCode, phone } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'そのメールアドレスは既に使用されています' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            address,
            apartment,
            city,
            zipCode,
            phone
        });

        await user.save();
        res.status(201).json({ message: '会員登録が完了しました' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

// POST /api/auth/user-login - Log in customer
router.post('/user-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'メールアドレスまたはパスワードが間違っています' });
        }

        const token = jwt.sign(
            { id: user._id, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

// GET /api/auth/me - Get current customer info
router.get('/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ message: '認証トークンがありません' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) return res.status(404).json({ message: 'ユーザーが見つかりません' });

        res.json(user);
    } catch (err) {
        res.status(401).json({ message: '認証に失敗しました' });
    }
});
// POST /api/auth/user-change-password - Change customer password
router.post('/user-change-password', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ message: '認証トークンがありません' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) return res.status(404).json({ message: 'ユーザーが見つかりません' });

        const { oldPassword, newPassword } = req.body;

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '現在のパスワードが正しくありません' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'パスワードを変更しました' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

module.exports = router;
