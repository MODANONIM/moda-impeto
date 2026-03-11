const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'moda-impeto-products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        // transformation: [{ width: 800, height: 800, crop: 'limit' }] // Optional resize
    },
});

// Init Upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
}).single('image');

// POST /api/upload
const auth = require('../middleware/auth');
router.post('/upload', auth, (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Upload Error:', err);
            return res.status(400).json({ message: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No file selected!' });
        }

        // Cloudinary returns file.path as the secure URL
        res.json({
            message: 'File Uploaded!',
            filePath: req.file.path // This will be the Cloudinary URL
        });
    });
});

module.exports = router;
