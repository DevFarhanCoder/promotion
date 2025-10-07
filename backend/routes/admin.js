const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const Admin = require('../models/Admin');
const PromoImage = require('../models/PromoImage');

const router = express.Router();

// Configure multer for admin image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'promo-base-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an image file'), false);
    }
  }
});

// Admin middleware
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(401).json({ message: 'Access denied. Admin only.' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check environment variables for admin credentials
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    // Generate admin token
    const token = jwt.sign(
      { 
        username: adminUsername,
        role: 'admin'
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        username: adminUsername,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
});

// @route   POST /api/admin/upload-promo-image
// @desc    Upload promotional base image
// @access  Private (Admin only)
router.post('/upload-promo-image', adminAuth, upload.single('promoImage'), async (req, res) => {
  try {
    const { type } = req.body; // e.g., 'english-day1', 'hindi-day2'
    
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    if (!type) {
      return res.status(400).json({ message: 'Image type is required' });
    }

    // Deactivate previous image of same type
    await PromoImage.updateMany({ type }, { isActive: false });

    // Create new promo image record
    const promoImage = new PromoImage({
      filename: req.file.filename,
      originalName: req.file.originalname,
      type: type,
      isActive: true
    });

    await promoImage.save();

    res.json({
      message: 'Promotional image uploaded successfully',
      promoImage: {
        id: promoImage._id,
        filename: promoImage.filename,
        originalName: promoImage.originalName,
        type: promoImage.type,
        imageUrl: `/uploads/${promoImage.filename}`
      }
    });

  } catch (error) {
    console.error('Upload promo image error:', error);
    res.status(500).json({ message: 'Error uploading promotional image' });
  }
});

// @route   GET /api/admin/promo-images
// @desc    Get all promotional images
// @access  Private (Admin only)
router.get('/promo-images', adminAuth, async (req, res) => {
  try {
    const promoImages = await PromoImage.find().sort({ createdAt: -1 });
    
    const imagesWithUrl = promoImages.map(img => ({
      id: img._id,
      filename: img.filename,
      originalName: img.originalName,
      type: img.type,
      isActive: img.isActive,
      createdAt: img.createdAt,
      imageUrl: `/uploads/${img.filename}`
    }));

    res.json({
      message: 'Promotional images retrieved successfully',
      images: imagesWithUrl
    });

  } catch (error) {
    console.error('Get promo images error:', error);
    res.status(500).json({ message: 'Error retrieving promotional images' });
  }
});

// @route   PUT /api/admin/promo-image/:id/activate
// @desc    Activate a promotional image
// @access  Private (Admin only)
router.put('/promo-image/:id/activate', adminAuth, async (req, res) => {
  try {
    const imageId = req.params.id;
    
    const promoImage = await PromoImage.findById(imageId);
    if (!promoImage) {
      return res.status(404).json({ message: 'Promotional image not found' });
    }

    // Deactivate other images of same type
    await PromoImage.updateMany({ type: promoImage.type }, { isActive: false });
    
    // Activate selected image
    promoImage.isActive = true;
    await promoImage.save();

    res.json({
      message: 'Promotional image activated successfully',
      promoImage
    });

  } catch (error) {
    console.error('Activate promo image error:', error);
    res.status(500).json({ message: 'Error activating promotional image' });
  }
});

// @route   DELETE /api/admin/promo-image/:id
// @desc    Delete a promotional image
// @access  Private (Admin only)
router.delete('/promo-image/:id', adminAuth, async (req, res) => {
  try {
    const imageId = req.params.id;
    
    const promoImage = await PromoImage.findById(imageId);
    if (!promoImage) {
      return res.status(404).json({ message: 'Promotional image not found' });
    }

    // Delete file from filesystem
    const fs = require('fs');
    const filepath = path.join(__dirname, '../uploads', promoImage.filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Delete from database
    await PromoImage.findByIdAndDelete(imageId);

    res.json({
      message: 'Promotional image deleted successfully'
    });

  } catch (error) {
    console.error('Delete promo image error:', error);
    res.status(500).json({ message: 'Error deleting promotional image' });
  }
});

module.exports = router;