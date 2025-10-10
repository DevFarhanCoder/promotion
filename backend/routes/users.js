const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an image file'), false);
    }
  }
});

// @route   GET /api/users/search
// @desc    Search users by mobile number
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { mobile } = req.query;
    
    if (!mobile) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }

    // Search for users whose mobile number contains the query
    const users = await User.find({
      mobile: { $regex: mobile, $options: 'i' }
    })
    .select('_id name displayName mobile')
    .limit(10);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        mobile: req.user.mobile,
        displayName: req.user.displayName,
        profilePhoto: req.user.profilePhoto,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, upload.single('profilePhoto'), async (req, res) => {
  try {
    const { name, displayName, mobile } = req.body;
    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (displayName) user.displayName = displayName;
    if (mobile) user.mobile = mobile;

    // Update profile photo if uploaded
    if (req.file) {
      // Delete old profile photo if exists
      if (user.profilePhoto) {
        const fs = require('fs');
        const oldPath = path.join(__dirname, '../uploads', user.profilePhoto);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      user.profilePhoto = req.file.filename;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @route   GET /api/users/my-referral-chain
// @desc    Get user's complete referral network chain with join dates
// @access  Private
router.get('/my-referral-chain', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Helper function to recursively find all referrals at each level
    async function getReferralChain(introducerId, level = 1, introducerName = '') {
      const directReferrals = await User.find({ introducer: introducerId })
        .select('_id name displayName createdAt introducer introducerName')
        .sort({ createdAt: -1 });

      let chain = [];

      for (const referral of directReferrals) {
        chain.push({
          _id: referral._id,
          name: referral.displayName || referral.name,
          joinedDate: referral.createdAt,
          level: level,
          introducerName: level > 1 ? introducerName : null
        });

        // Recursively get this user's referrals
        const subReferrals = await getReferralChain(
          referral._id, 
          level + 1, 
          referral.displayName || referral.name
        );
        chain = chain.concat(subReferrals);
      }

      return chain;
    }

    // Get complete referral chain starting from this user
    const referralChain = await getReferralChain(userId);

    // Calculate stats
    const directReferrals = referralChain.filter(r => r.level === 1).length;
    const totalReferrals = referralChain.length;

    res.json({
      referralChain,
      stats: {
        directReferrals,
        totalReferrals
      }
    });

  } catch (error) {
    console.error('Get referral chain error:', error);
    res.status(500).json({ message: 'Server error fetching referral chain' });
  }
});

// @route   GET /api/users/search-all
// @desc    Search users by name or mobile number (for referral network search)
// @access  Private
router.get('/search-all', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    // Search for users by name, displayName, or mobile number
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query, $options: 'i' } }
      ]
    })
    .select('_id name displayName mobile')
    .limit(20)
    .sort({ name: 1 });

    res.json({ users });
  } catch (error) {
    console.error('Search all users error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
});

// @route   GET /api/users/referral-network/:userId
// @desc    Get 6-level referral network for any user (same logic as admin)
// @access  Private
router.get('/referral-network/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const targetUser = await User.findById(userId).select('name displayName mobile createdAt');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Helper function to calculate branch levels for a specific user's referral chain
    const calculateBranchLevels = async (userId) => {
      const levels = {
        level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, total: 0
      };
      
      // Level 2: Direct referrals of this user
      const level2Users = await User.find({ introducer: userId }).select('_id');
      levels.level2 = level2Users.length;
      
      if (level2Users.length > 0) {
        // Level 3: Referrals of Level 2 users
        const level2Ids = level2Users.map(u => u._id);
        const level3Users = await User.find({ introducer: { $in: level2Ids } }).select('_id');
        levels.level3 = level3Users.length;
        
        if (level3Users.length > 0) {
          // Level 4: Referrals of Level 3 users
          const level3Ids = level3Users.map(u => u._id);
          const level4Users = await User.find({ introducer: { $in: level3Ids } }).select('_id');
          levels.level4 = level4Users.length;
          
          if (level4Users.length > 0) {
            // Level 5: Referrals of Level 4 users
            const level4Ids = level4Users.map(u => u._id);
            const level5Users = await User.find({ introducer: { $in: level4Ids } }).select('_id');
            levels.level5 = level5Users.length;
            
            if (level5Users.length > 0) {
              // Level 6: Referrals of Level 5 users
              const level5Ids = level5Users.map(u => u._id);
              const level6Users = await User.find({ introducer: { $in: level5Ids } }).select('_id');
              levels.level6 = level6Users.length;
            }
          }
        }
      }
      
      levels.total = levels.level2 + levels.level3 + levels.level4 + levels.level5 + levels.level6;
      return levels;
    };

    // Get direct referrals (Level 1 users)
    const level1Users = await User.find({ 
      introducer: targetUser._id 
    }).select('name displayName mobile createdAt');

    const branches = [];

    // Add target user as first branch with their total network counts
    const rootBranchData = await calculateBranchLevels(targetUser._id);
    branches.push({
      id: targetUser._id,
      name: targetUser.name,
      displayName: targetUser.displayName,
      mobile: targetUser.mobile,
      joinDate: targetUser.createdAt,
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
      
      branches.push({
        id: level1User._id,
        name: level1User.name,
        displayName: level1User.displayName,
        mobile: level1User.mobile,
        joinDate: level1User.createdAt,
        isRoot: false,
        level2: branchData.level2,
        level3: branchData.level3,
        level4: branchData.level4,
        level5: branchData.level5,
        level6: branchData.level6,
        totalUsers: branchData.total
      });
    }

    res.json({
      user: {
        id: targetUser._id,
        name: targetUser.name,
        displayName: targetUser.displayName,
        mobile: targetUser.mobile
      },
      branches,
      totalBranches: branches.length
    });

  } catch (error) {
    console.error('Get referral network error:', error);
    res.status(500).json({ message: 'Server error fetching referral network' });
  }
});

// @route   GET /api/users/level-users/:branchUserId/:level
// @desc    Get users at a specific level under a branch user
// @access  Private
router.get('/level-users/:branchUserId/:level', auth, async (req, res) => {
  try {
    const { branchUserId, level } = req.params;
    const levelNum = parseInt(level);

    if (levelNum < 2 || levelNum > 6) {
      return res.status(400).json({ message: 'Level must be between 2 and 6' });
    }

    // Get the branch user
    const branchUser = await User.findById(branchUserId).select('name displayName mobile');
    if (!branchUser) {
      return res.status(404).json({ message: 'Branch user not found' });
    }

    let users = [];
    let currentLevelIds = [branchUserId];

    // Navigate through levels to reach the target level
    for (let i = 1; i < levelNum; i++) {
      const nextLevelUsers = await User.find({
        introducer: { $in: currentLevelIds }
      }).select('_id');
      
      currentLevelIds = nextLevelUsers.map(u => u._id);
      
      if (currentLevelIds.length === 0) break;
    }

    // Get full user details at the target level
    if (currentLevelIds.length > 0) {
      users = await User.find({
        introducer: { $in: currentLevelIds }
      }).select('name displayName mobile createdAt introducerName')
        .populate('introducer', 'name displayName mobile')
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      branchUser: {
        id: branchUser._id,
        name: branchUser.name,
        displayName: branchUser.displayName,
        mobile: branchUser.mobile
      },
      level: levelNum,
      users,
      totalUsers: users.length
    });

  } catch (error) {
    console.error('Get level users error:', error);
    res.status(500).json({ message: 'Server error fetching level users' });
  }
});

module.exports = router;