const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const Admin = require('../models/Admin');
const PromoImage = require('../models/PromoImage');
const User = require('../models/User');

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
    const { title, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    // Create new promo image record with automatic date
    const promoImage = new PromoImage({
      filename: req.file.filename,
      originalName: req.file.originalname,
      title: title || 'Promotional Event',
      description: description || '',
      isActive: true,
      eventDate: new Date() // Automatically set to current date
    });

    await promoImage.save();

    res.json({
      message: 'Promotional image uploaded successfully',
      promoImage: {
        id: promoImage._id,
        filename: promoImage.filename,
        originalName: promoImage.originalName,
        title: promoImage.title,
        description: promoImage.description,
        eventDate: promoImage.eventDate,
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
    const promoImages = await PromoImage.find().sort({ eventDate: -1 });
    
    const imagesWithUrl = promoImages.map(img => ({
      id: img._id,
      filename: img.filename,
      originalName: img.originalName,
      title: img.title,
      description: img.description,
      isActive: img.isActive,
      eventDate: img.eventDate,
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

// @route   GET /api/admin/public-images
// @desc    Get promotional images for public users (no auth required)
// @access  Public
router.get('/public-images', async (req, res) => {
  try {
    const promoImages = await PromoImage.find({ isActive: true }).sort({ eventDate: -1 });
    
    const imagesWithUrl = promoImages.map(img => ({
      id: img._id,
      filename: img.filename,
      title: img.title,
      description: img.description,
      eventDate: img.eventDate,
      imageUrl: `/uploads/${img.filename}`
    }));

    res.json({
      message: 'Promotional images retrieved successfully',
      images: imagesWithUrl
    });

  } catch (error) {
    console.error('Get public images error:', error);
    res.status(500).json({ message: 'Error retrieving promotional images' });
  }
});

// @route   GET /api/admin/public-top-introducers
// @desc    Get top introducers for public users (no auth required)
// @access  Public
router.get('/public-top-introducers', async (req, res) => {
  try {
    // Get top introducers
    const topIntroducers = await User.aggregate([
      {
        $group: {
          _id: '$introducer',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'introducerInfo'
        }
      },
      {
        $unwind: '$introducerInfo'
      },
      {
        $project: {
          count: 1,
          name: '$introducerInfo.name',
          displayName: '$introducerInfo.displayName',
          mobile: '$introducerInfo.mobile'
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      message: 'Top introducers retrieved successfully',
      topIntroducers
    });

  } catch (error) {
    console.error('Get public top introducers error:', error);
    res.status(500).json({ message: 'Error retrieving top introducers' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with their basic info
// @access  Private (Admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .populate('introducer', 'name displayName mobile')
      .sort({ createdAt: -1 })
      .select('-password');

    // Calculate referral count for each user
    const usersWithReferralCount = await Promise.all(
      users.map(async (user) => {
        const referralCount = await User.countDocuments({ introducer: user._id });
        return {
          ...user.toJSON(),
          referralCount
        };
      })
    );

    res.json({
      message: 'Users retrieved successfully',
      users: usersWithReferralCount
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Error retrieving users' });
  }
});

// @route   GET /api/admin/users/:userId/referrals
// @desc    Get all users referred by a specific user
// @access  Private (Admin only)
router.get('/users/:userId/referrals', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // First, get the introducer user details
    const introducer = await User.findById(userId).select('-password');
    if (!introducer) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all users referred by this user
    const referrals = await User.find({ introducer: userId })
      .sort({ createdAt: -1 })
      .select('-password');

    // Calculate second-level referrals for each direct referral
    const referralsWithSubCount = await Promise.all(
      referrals.map(async (referral) => {
        const subReferralCount = await User.countDocuments({ introducer: referral._id });
        return {
          ...referral.toJSON(),
          subReferralCount
        };
      })
    );

    res.json({
      message: 'Referrals retrieved successfully',
      introducer: {
        id: introducer._id,
        name: introducer.name,
        displayName: introducer.displayName,
        mobile: introducer.mobile,
        createdAt: introducer.createdAt
      },
      referrals: referralsWithSubCount,
      totalReferrals: referrals.length
    });

  } catch (error) {
    console.error('Get user referrals error:', error);
    res.status(500).json({ message: 'Error retrieving user referrals' });
  }
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete a user and all their data
// @access  Private (Admin only)
router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all users referred by this user (they will need new introducers)
    const referredUsers = await User.find({ introducer: userId });

    // If user has referrals, we need to handle them
    if (referredUsers.length > 0) {
      // Option 1: Reassign them to the deleted user's introducer
      // Option 2: Set them to a default admin introducer
      // Option 3: Delete cascade (delete all referrals too)
      
      // For now, let's reassign them to the deleted user's introducer
      if (user.introducer) {
        const newIntroducer = await User.findById(user.introducer);
        if (newIntroducer) {
          await User.updateMany(
            { introducer: userId },
            { 
              introducer: user.introducer,
              introducerMobile: newIntroducer.mobile,
              introducerName: newIntroducer.name
            }
          );
        }
      }
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        displayName: user.displayName,
        mobile: user.mobile
      },
      reassignedReferralsCount: referredUsers.length
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// @route   GET /api/admin/users/stats
// @desc    Get user statistics for admin dashboard
// @access  Private (Admin only)
router.get('/users/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersToday = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    const usersThisWeek = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const usersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    // Top introducers
    const topIntroducers = await User.aggregate([
      {
        $group: {
          _id: '$introducer',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'introducerInfo'
        }
      },
      {
        $unwind: '$introducerInfo'
      },
      {
        $project: {
          count: 1,
          name: '$introducerInfo.name',
          displayName: '$introducerInfo.displayName',
          mobile: '$introducerInfo.mobile'
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.json({
      message: 'User statistics retrieved successfully',
      stats: {
        totalUsers,
        usersToday,
        usersThisWeek,
        usersThisMonth,
        topIntroducers
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Error retrieving user statistics' });
  }
});

module.exports = router;