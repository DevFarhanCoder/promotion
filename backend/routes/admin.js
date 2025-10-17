const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const Admin = require('../models/Admin');
const PromoImage = require('../models/PromoImage');
const ChannelPartner = require('../models/ChannelPartner');
const Customer = require('../models/Customer');

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
    
    // Filter out images where the file doesn't exist
    const fs = require('fs');
    const path = require('path');
    
    const imagesWithUrl = promoImages
      .filter(img => {
        const filePath = path.join(__dirname, '../uploads', img.filename);
        const exists = fs.existsSync(filePath);
        if (!exists) {
          console.log(`Warning: Image file not found for ${img.filename}, skipping from results`);
        }
        return exists;
      })
      .map(img => ({
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

// @route   GET /api/admin/all-users
// @desc    Get all users for user management page
// @access  Private (Admin only)
router.get('/all-users', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .populate('introducer', 'name displayName mobile')
      .sort({ createdAt: -1 })
      .select('-password');

    // Format users with introducer information
    const formattedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
      displayName: user.displayName,
      mobile: user.mobile,
      createdAt: user.createdAt,
      isActive: user.isActive !== false,
      introducerName: user.introducer ? (user.introducer.name) : null,
      introducerMobile: user.introducer ? user.introducer.mobile : null,
      introducerId: user.introducer ? user.introducer._id : null
    }));

    res.json({
      message: 'All users retrieved successfully',
      users: formattedUsers
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Error retrieving users' });
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

// @route   GET /api/admin/referral-network
// @desc    Get 6-level hierarchical referral network with independent branch logic
// @access  Private (Admin only)
router.get('/referral-network', adminAuth, async (req, res) => {
  try {
    const { rootUserId } = req.query; // Add support for filtering by specific root user
    
    // Helper function to find user in any collection
    const findUserInAnyCollection = async (userId) => {
      let user = await ChannelPartner.findById(userId).select('name displayName mobile createdAt userType');
      if (user) return user;
      
      user = await Customer.findById(userId).select('name displayName mobile createdAt userType');
      if (user) return user;
      
      user = await User.findById(userId).select('name displayName mobile createdAt');
      return user;
    };

    // Helper function to find referrals in all collections
    const findReferralsInAllCollections = async (introducerId) => {
      const channelPartners = await ChannelPartner.find({ introducer: introducerId }).select('_id name displayName mobile createdAt userType');
      const customers = await Customer.find({ introducer: introducerId }).select('_id name displayName mobile createdAt userType');
      const oldUsers = await User.find({ introducer: introducerId }).select('_id name displayName mobile createdAt');
      
      return [...channelPartners, ...customers, ...oldUsers];
    };
    
    // Helper function to calculate branch levels for a specific user's referral chain
    const calculateBranchLevels = async (userId) => {
      const levels = {
        level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, total: 0
      };
      
      // Level 2: Direct referrals of this user
      const level2Users = await findReferralsInAllCollections(userId);
      levels.level2 = level2Users.length;
      
      if (level2Users.length > 0) {
        // Level 3: Referrals of Level 2 users
        const level2Ids = level2Users.map(u => u._id);
        let level3Users = [];
        for (const id of level2Ids) {
          const referrals = await findReferralsInAllCollections(id);
          level3Users = level3Users.concat(referrals);
        }
        levels.level3 = level3Users.length;
        
        if (level3Users.length > 0) {
          // Level 4: Referrals of Level 3 users
          const level3Ids = level3Users.map(u => u._id);
          let level4Users = [];
          for (const id of level3Ids) {
            const referrals = await findReferralsInAllCollections(id);
            level4Users = level4Users.concat(referrals);
          }
          levels.level4 = level4Users.length;
          
          if (level4Users.length > 0) {
            // Level 5: Referrals of Level 4 users
            const level4Ids = level4Users.map(u => u._id);
            let level5Users = [];
            for (const id of level4Ids) {
              const referrals = await findReferralsInAllCollections(id);
              level5Users = level5Users.concat(referrals);
            }
            levels.level5 = level5Users.length;
            
            if (level5Users.length > 0) {
              // Level 6: Referrals of Level 5 users
              const level5Ids = level5Users.map(u => u._id);
              let level6Users = [];
              for (const id of level5Ids) {
                const referrals = await findReferralsInAllCollections(id);
                level6Users = level6Users.concat(referrals);
              }
              levels.level6 = level6Users.length;
            }
          }
        }
      }
      
      levels.total = levels.level2 + levels.level3 + levels.level4 + levels.level5 + levels.level6;
      return levels;
    };

    let rootUsers;
    
    if (rootUserId) {
      // If specific root user is requested, get only that user
      const user = await findUserInAnyCollection(rootUserId);
      rootUsers = user ? [user] : [];
      console.log(`Filtering for specific root user: ${rootUserId}`);
    } else {
      // Get all users who have referrals from all collections
      const cpIntroducers = await ChannelPartner.distinct('introducer');
      const custIntroducers = await Customer.distinct('introducer');
      const userIntroducers = await User.distinct('introducer');
      
      const allIntroducerIds = [...new Set([...cpIntroducers, ...custIntroducers, ...userIntroducers])];
      
      // Find these users in all collections
      const channelPartners = await ChannelPartner.find({ _id: { $in: allIntroducerIds } }).select('name displayName mobile createdAt userType');
      const customers = await Customer.find({ _id: { $in: allIntroducerIds } }).select('name displayName mobile createdAt userType');
      const oldUsers = await User.find({ _id: { $in: allIntroducerIds } }).select('name displayName mobile createdAt');
      
      // Remove duplicates by ID
      const allUsers = [...channelPartners, ...customers, ...oldUsers];
      const uniqueUsersMap = new Map();
      allUsers.forEach(user => {
        if (!uniqueUsersMap.has(user._id.toString())) {
          uniqueUsersMap.set(user._id.toString(), user);
        }
      });
      
      rootUsers = Array.from(uniqueUsersMap.values());
    }
    
    console.log('Found root users:', rootUsers.length);
    
    const networkData = [];
    
    for (const rootUser of rootUsers) {
      // Get direct referrals (Level 1 users) from all collections
      const level1Users = await findReferralsInAllCollections(rootUser._id);
      
      console.log(`Root user ${rootUser.name} has ${level1Users.length} direct referrals`);
      
      // Create the root user entry with their branches
      const rootEntry = {
        id: rootUser._id,
        name: rootUser.name,
        displayName: rootUser.displayName,
        mobile: rootUser.mobile,
        joinDate: rootUser.createdAt,
        userType: rootUser.userType || 'user',
        isRoot: true,
        branches: []
      };
      
      // Add root user as first branch with their total network counts
      const rootBranchData = await calculateBranchLevels(rootUser._id);
      rootEntry.branches.push({
        id: rootUser._id,
        name: rootUser.name,
        displayName: rootUser.displayName,
        mobile: rootUser.mobile,
        joinDate: rootUser.createdAt,
        userType: rootUser.userType || 'user',
        isRoot: true,
        level2: rootBranchData.level2,
        level3: rootBranchData.level3,
        level4: rootBranchData.level4,
        level5: rootBranchData.level5,
        level6: rootBranchData.level6,
        totalUsers: rootBranchData.total
      });
      
      // Calculate branch data for each Level 1 user (direct referrals)
      for (const level1User of level1Users) {
        const branchData = await calculateBranchLevels(level1User._id);
        
        rootEntry.branches.push({
          id: level1User._id,
          name: level1User.name,
          displayName: level1User.displayName,
          mobile: level1User.mobile,
          joinDate: level1User.createdAt,
          userType: level1User.userType || 'user',
          isRoot: false,
          level2: branchData.level2,
          level3: branchData.level3,
          level4: branchData.level4,
          level5: branchData.level5,
          level6: branchData.level6,
          totalUsers: branchData.total
        });
      }
      
      networkData.push(rootEntry);
    }

    // Calculate grand totals across all branches
    const grandTotals = {
      level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, total: 0
    };

    networkData.forEach(rootData => {
      rootData.branches.forEach(branch => {
        if (branch.isRoot) {
          grandTotals.level2 += branch.level2;
        }
        grandTotals.level2 += branch.level2;
        grandTotals.level3 += branch.level3;
        grandTotals.level4 += branch.level4;
        grandTotals.level5 += branch.level5;
        grandTotals.level6 += branch.level6;
        grandTotals.total += branch.totalUsers;
      });
      grandTotals.level1 += rootData.branches.length - 1; // Subtract 1 for root user
    });

    res.json({
      success: true,
      message: '6-level hierarchical network retrieved successfully',
      data: networkData,
      grandTotals,
      totalRootUsers: networkData.length
    });

  } catch (error) {
    console.error('Get hierarchical network error:', error);
    res.status(500).json({ message: 'Error retrieving hierarchical network' });
  }
});

// @route   GET /api/admin/level-users/:branchUserId/:level
// @desc    Get detailed user list for a specific level under a branch user
// @access  Private (Admin only)
router.get('/level-users/:branchUserId/:level', adminAuth, async (req, res) => {
  try {
    const { branchUserId, level } = req.params;
    const targetLevel = parseInt(level);

    if (targetLevel < 2 || targetLevel > 6) {
      return res.status(400).json({ message: 'Level must be between 2 and 6' });
    }

    // Get branch user info
    const branchUser = await User.findById(branchUserId).select('name displayName mobile');
    if (!branchUser) {
      return res.status(404).json({ message: 'Branch user not found' });
    }

    // Helper function to get users at specific level from the branch user
    const getUsersForLevel = async (startUserId, targetLevel) => {
      let currentLevelIds = [startUserId];
      
      // Navigate down to the target level
      for (let currentLevel = 2; currentLevel <= targetLevel; currentLevel++) {
        if (currentLevelIds.length === 0) break;
        
        const nextLevelUsers = await User.find({ 
          introducer: { $in: currentLevelIds } 
        }).select('name displayName mobile createdAt introducer introducerName introducerMobile');
        
        if (currentLevel === targetLevel) {
          // This is our target level, return these users with introducer info
          const usersWithIntroducerInfo = nextLevelUsers.map(user => ({
            _id: user._id,
            name: user.name,
            displayName: user.displayName,
            mobile: user.mobile,
            createdAt: user.createdAt,
            introducerName: user.introducerName || 'Unknown',
            introducerDisplayName: user.introducerDisplayName || 'Unknown',
            introducerMobile: user.introducerMobile || 'Unknown'
          }));
          
          return usersWithIntroducerInfo;
        }
        
        // Move to next level
        currentLevelIds = nextLevelUsers.map(u => u._id);
      }
      
      return [];
    };

    // Get users at the specified level
    const levelUsers = await getUsersForLevel(branchUserId, targetLevel);

    // Sort by join date (newest first)
    levelUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      message: `Level ${targetLevel} users retrieved successfully`,
      branchUser: {
        id: branchUserId,
        name: branchUser.name,
        displayName: branchUser.displayName,
        mobile: branchUser.mobile
      },
      level: targetLevel,
      users: levelUsers,
      totalUsers: levelUsers.length
    });

  } catch (error) {
    console.error('Get level users error:', error);
    res.status(500).json({ message: 'Error retrieving level users' });
  }
});

// @route   GET /api/admin/referral-chain/:userId
// @desc    Get complete referral chain flow for a specific user
// @access  Private (Admin only)
router.get('/referral-chain/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get the root user
    const rootUser = await User.findById(userId).select('-password');
    if (!rootUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Helper function to build referral tree
    const buildReferralTree = async (userId, level = 1, maxLevel = 5) => {
      if (level > maxLevel) return [];

      const directReferrals = await User.find({ introducer: userId })
        .select('_id name displayName mobile createdAt')
        .sort({ createdAt: -1 });

      const referralTree = [];

      for (const referral of directReferrals) {
        const childReferrals = await buildReferralTree(referral._id, level + 1, maxLevel);
        
        referralTree.push({
          id: referral._id,
          name: referral.name,
          displayName: referral.displayName,
          mobile: referral.mobile,
          joinDate: referral.createdAt,
          level: level,
          children: childReferrals,
          childrenCount: childReferrals.length
        });
      }

      return referralTree;
    };

    // Build the complete referral tree
    const referralTree = await buildReferralTree(userId);

    // Calculate level-wise counts
    const calculateLevelCounts = (tree, counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) => {
      tree.forEach(node => {
        if (counts[node.level] !== undefined) {
          counts[node.level]++;
        }
        if (node.children && node.children.length > 0) {
          calculateLevelCounts(node.children, counts);
        }
      });
      return counts;
    };

    const levelCounts = calculateLevelCounts(referralTree);
    const totalReferrals = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);

    res.json({
      message: 'Referral chain retrieved successfully',
      rootUser: {
        id: rootUser._id,
        name: rootUser.name,
        displayName: rootUser.displayName,
        mobile: rootUser.mobile,
        joinDate: rootUser.createdAt
      },
      referralTree,
      levelCounts,
      totalReferrals
    });

  } catch (error) {
    console.error('Get referral chain error:', error);
    res.status(500).json({ message: 'Error retrieving referral chain' });
  }
});

// @route   GET /api/admin/referral-connections
// @desc    Get referral connections with optional filtering by introducer
// @access  Private (Admin only)
router.get('/referral-connections', adminAuth, async (req, res) => {
  try {
    const { introducerId, introducerMobile } = req.query;
    
    let query = {};
    let introducerInfo = null;
    
    // If filtering by introducer, find the introducer first
    if (introducerId) {
      introducerInfo = await User.findById(introducerId).select('name displayName mobile');
      if (!introducerInfo) {
        return res.status(404).json({ message: 'Introducer not found' });
      }
      query.introducer = introducerId;
    } else if (introducerMobile) {
      introducerInfo = await User.findOne({ mobile: introducerMobile }).select('name displayName mobile');
      if (!introducerInfo) {
        return res.status(404).json({ message: 'Introducer not found with this mobile number' });
      }
      query.introducer = introducerInfo._id;
    }

    // Get users based on query (all users or filtered by introducer)
    const users = await User.find(query)
      .populate('introducer', 'name displayName mobile')
      .sort({ createdAt: -1 })
      .select('-password');

    // Calculate referral count for each user
    const referralConnections = await Promise.all(
      users.map(async (user) => {
        const referralCount = await User.countDocuments({ introducer: user._id });
        
        return {
          id: user._id,
          name: user.name,
          displayName: user.displayName,
          mobile: user.mobile,
          joinDate: user.createdAt,
          introducerName: user.introducer ? 
            (user.introducer.displayName || user.introducer.name) : 
            'N/A',
          introducerMobile: user.introducer ? user.introducer.mobile : 'N/A',
          introducerId: user.introducer ? user.introducer._id : null,
          referralCount
        };
      })
    );

    // Get some basic stats
    const totalUsers = users.length;
    const usersWithReferrals = referralConnections.filter(user => user.referralCount > 0).length;
    const totalConnections = referralConnections.reduce((sum, user) => sum + user.referralCount, 0);

    res.json({
      message: introducerInfo ? 
        `Direct referrals of ${introducerInfo.displayName || introducerInfo.name} retrieved successfully` :
        'All referral connections retrieved successfully',
      connections: referralConnections,
      introducerInfo: introducerInfo ? {
        id: introducerInfo._id,
        name: introducerInfo.name,
        displayName: introducerInfo.displayName,
        mobile: introducerInfo.mobile
      } : null,
      stats: {
        totalUsers,
        usersWithReferrals,
        totalConnections,
        averageReferralsPerUser: totalUsers > 0 ? (totalConnections / totalUsers).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('Get referral connections error:', error);
    res.status(500).json({ message: 'Error retrieving referral connections' });
  }
});

// @route   GET /api/admin/all-users-with-introducers
// @desc    Get all users with their introducer information (for dropdown/selection)
// @access  Private (Admin only)
router.get('/all-users-with-introducers', adminAuth, async (req, res) => {
  try {
    // Get all users who have made referrals (potential introducers)
    const introducers = await User.aggregate([
      {
        $group: {
          _id: '$introducer',
          referralCount: { $sum: 1 }
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
          _id: '$introducerInfo._id',
          name: '$introducerInfo.name',
          displayName: '$introducerInfo.displayName',
          mobile: '$introducerInfo.mobile',
          referralCount: 1
        }
      },
      {
        $sort: { referralCount: -1 }
      }
    ]);

    console.log('Found introducers:', introducers.map(i => `${i.name}/${i.displayName} (${i.mobile}) - ${i.referralCount} referrals`));

    res.json({
      message: 'Introducers list retrieved successfully',
      introducers
    });

  } catch (error) {
    console.error('Get introducers error:', error);
    res.status(500).json({ message: 'Error retrieving introducers list' });
  }
});

// @route   GET /api/admin/hierarchical-chain/:userId
// @desc    Get hierarchical referral chain starting from a specific user
// @access  Private (Admin only)
router.get('/hierarchical-chain/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const maxLevels = parseInt(req.query.maxLevels) || 5;

    console.log('Hierarchical chain requested for user ID:', userId);

    // Get the root user
    const rootUser = await User.findById(userId).select('-password');
    if (!rootUser) {
      console.log('User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found root user:', rootUser.name, rootUser.displayName, rootUser.mobile);

    // Helper function to build hierarchical chain
    const buildHierarchicalChain = async (parentId, currentLevel = 1) => {
      if (currentLevel > maxLevels) return [];

      console.log(`Building level ${currentLevel} for parent ID: ${parentId}`);

      const directReferrals = await User.find({ introducer: parentId })
        .select('_id name displayName mobile createdAt')
        .sort({ createdAt: -1 });

      console.log(`Found ${directReferrals.length} direct referrals at level ${currentLevel}:`, 
        directReferrals.map(u => `${u.name} (@${u.displayName}) - ${u.mobile}`));

      const levelData = [];

      for (const user of directReferrals) {
        // Get count of their direct referrals
        const directReferralCount = await User.countDocuments({ introducer: user._id });
        
        // Recursively get their referrals for next level
        const nextLevelReferrals = await buildHierarchicalChain(user._id, currentLevel + 1);
        
        levelData.push({
          id: user._id,
          name: user.name,
          displayName: user.displayName,
          mobile: user.mobile,
          joinDate: user.createdAt,
          level: currentLevel,
          directReferralCount,
          nextLevelReferrals
        });
      }

      return levelData;
    };

    // Build the complete hierarchical chain
    const hierarchicalChain = await buildHierarchicalChain(userId);

    console.log('Built hierarchical chain with', hierarchicalChain.length, 'level 1 users');
    console.log('Level 1 users:', hierarchicalChain.map(u => u.name));

    // Calculate totals per level
    const calculateLevelTotals = (chain, levelTotals = {}) => {
      chain.forEach(user => {
        if (!levelTotals[user.level]) {
          levelTotals[user.level] = 0;
        }
        levelTotals[user.level]++;
        
        if (user.nextLevelReferrals && user.nextLevelReferrals.length > 0) {
          calculateLevelTotals(user.nextLevelReferrals, levelTotals);
        }
      });
      return levelTotals;
    };

    const levelTotals = calculateLevelTotals(hierarchicalChain);
    const totalUsers = Object.values(levelTotals).reduce((sum, count) => sum + count, 0);

    console.log('Level totals:', levelTotals);
    console.log('Total users in chain:', totalUsers);

    res.json({
      message: 'Hierarchical referral chain retrieved successfully',
      rootUser: {
        id: rootUser._id,
        name: rootUser.name,
        displayName: rootUser.displayName,
        mobile: rootUser.mobile,
        joinDate: rootUser.createdAt
      },
      hierarchicalChain,
      levelTotals,
      totalUsers,
      maxLevels
    });

  } catch (error) {
    console.error('Get hierarchical chain error:', error);
    res.status(500).json({ message: 'Error retrieving hierarchical chain' });
  }
});

// @route   GET /api/admin/level-users-hierarchical/:userId/:level
// @desc    Get users at a specific level in the hierarchical chain
// @access  Private (Admin only)
router.get('/level-users-hierarchical/:userId/:level', adminAuth, async (req, res) => {
  try {
    const { userId, level } = req.params;
    const targetLevel = parseInt(level);

    // Get the root user
    const rootUser = await User.findById(userId).select('name displayName mobile');
    if (!rootUser) {
      return res.status(404).json({ message: 'Root user not found' });
    }

    // Helper function to get users at specific level
    const getUsersAtLevel = async (parentIds, currentLevel = 1) => {
      if (currentLevel > targetLevel) return [];
      
      const users = await User.find({ introducer: { $in: parentIds } })
        .select('_id name displayName mobile createdAt introducer')
        .sort({ createdAt: -1 });

      if (currentLevel === targetLevel) {
        // This is our target level
        const usersWithReferralCount = await Promise.all(
          users.map(async (user) => {
            const referralCount = await User.countDocuments({ introducer: user._id });
            return {
              id: user._id,
              name: user.name,
              displayName: user.displayName,
              mobile: user.mobile,
              joinDate: user.createdAt,
              referralCount,
              level: currentLevel
            };
          })
        );
        return usersWithReferralCount;
      }

      // Continue to next level
      const nextParentIds = users.map(u => u._id);
      return await getUsersAtLevel(nextParentIds, currentLevel + 1);
    };

    // Get users at the target level
    const levelUsers = await getUsersAtLevel([userId], 1);

    res.json({
      message: `Level ${targetLevel} users retrieved successfully`,
      rootUser: {
        id: rootUser._id,
        name: rootUser.name,
        displayName: rootUser.displayName,
        mobile: rootUser.mobile
      },
      level: targetLevel,
      users: levelUsers,
      totalUsers: levelUsers.length
    });

  } catch (error) {
    console.error('Get level users hierarchical error:', error);
    res.status(500).json({ message: 'Error retrieving level users' });
  }
});

// @route   GET /api/admin/test-referrals/:mobile
// @desc    Test endpoint to check specific user's referrals by mobile number
// @access  Private (Admin only)
router.get('/test-referrals/:mobile', adminAuth, async (req, res) => {
  try {
    const { mobile } = req.params;
    
    // Find user by mobile
    const user = await User.findOne({ mobile }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found with this mobile number' });
    }

    console.log('Found user:', user.name, user.displayName, user.mobile);

    // Get their direct referrals
    const directReferrals = await User.find({ introducer: user._id })
      .select('name displayName mobile createdAt')
      .sort({ createdAt: -1 });

    console.log('Direct referrals:', directReferrals.map(r => `${r.name} (@${r.displayName}) - ${r.mobile}`));

    res.json({
      message: 'User and referrals found',
      user: {
        id: user._id,
        name: user.name,
        displayName: user.displayName,
        mobile: user.mobile
      },
      directReferrals: directReferrals.map(r => ({
        id: r._id,
        name: r.name,
        displayName: r.displayName,
        mobile: r.mobile,
        joinDate: r.createdAt
      })),
      count: directReferrals.length
    });

  } catch (error) {
    console.error('Test referrals error:', error);
    res.status(500).json({ message: 'Error testing referrals' });
  }
});

// @route   DELETE /api/admin/cleanup-orphaned-images
// @desc    Remove database records for images where files don't exist
// @access  Private (Admin only)
router.delete('/cleanup-orphaned-images', adminAuth, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const allImages = await PromoImage.find();
    const orphanedImages = [];
    const validImages = [];
    
    for (const img of allImages) {
      const filePath = path.join(__dirname, '../uploads', img.filename);
      if (!fs.existsSync(filePath)) {
        orphanedImages.push(img);
        await PromoImage.findByIdAndDelete(img._id);
      } else {
        validImages.push(img);
      }
    }
    
    res.json({
      message: 'Cleanup completed successfully',
      orphanedImagesRemoved: orphanedImages.length,
      validImagesRemaining: validImages.length,
      removedImages: orphanedImages.map(img => ({
        id: img._id,
        filename: img.filename,
        title: img.title
      }))
    });

  } catch (error) {
    console.error('Cleanup orphaned images error:', error);
    res.status(500).json({ message: 'Error during cleanup' });
  }
});

module.exports = router;