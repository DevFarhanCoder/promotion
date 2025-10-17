const express = require('express');
const ChannelPartner = require('../models/ChannelPartner');
const Customer = require('../models/Customer');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/all-users
// @desc    Get all direct referrals of the logged-in user from ChannelPartner and Customer collections
// @access  Private
router.get('/all-users', auth, async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Fetch only Channel Partners who were directly referred by the logged-in user
    const channelPartners = await ChannelPartner.find({ introducer: loggedInUserId })
      .select('name displayName mobile userType introducer introducerModel createdAt');

    // Fetch only Customers who were directly referred by the logged-in user
    const customers = await Customer.find({ introducer: loggedInUserId })
      .select('name displayName mobile userType introducer introducerModel createdAt');

    // Manually populate the introducer for each user
    const populateIntroducer = async (users) => {
      const populatedUsers = [];
      for (const user of users) {
        const userObj = user.toObject();
        
        // Since all these users were referred by the logged-in user,
        // we can directly use req.user data for the introducer
        userObj.introducerName = req.user.displayName || req.user.name;
        userObj.introducerData = {
          name: req.user.name,
          displayName: req.user.displayName,
          mobile: req.user.mobile
        };
        
        populatedUsers.push(userObj);
      }
      return populatedUsers;
    };

    // Populate introducers for both arrays
    const [populatedCP, populatedCust] = await Promise.all([
      populateIntroducer(channelPartners),
      populateIntroducer(customers)
    ]);

    // Combine both arrays
    let allUsers = [...populatedCP, ...populatedCust];

    // Remove duplicates (users who are in both collections - userType: 'both')
    const uniqueUsers = [];
    const seenMobiles = new Set();

    for (const user of allUsers) {
      if (!seenMobiles.has(user.mobile)) {
        seenMobiles.add(user.mobile);
        uniqueUsers.push({
          ...user,
          // Determine actual userType based on which collections they're in
          actualUserType: user.userType || 'N/A'
        });
      }
    }

    // Sort by creation date (newest first)
    uniqueUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ users: uniqueUsers });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/search-introducers
// @desc    Search for potential introducers by mobile/name in both collections
// @access  Private
router.get('/search-introducers', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const searchQuery = {
      $or: [
        { mobile: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } }
      ]
    };

    // Search in both ChannelPartner and Customer collections
    const [channelPartners, customers] = await Promise.all([
      ChannelPartner.find(searchQuery).select('_id name displayName mobile').limit(10).lean(),
      Customer.find(searchQuery).select('_id name displayName mobile').limit(10).lean()
    ]);

    // Combine and remove duplicates
    const allResults = [...channelPartners, ...customers];
    const uniqueResults = [];
    const seenMobiles = new Set();

    for (const user of allResults) {
      if (!seenMobiles.has(user.mobile)) {
        seenMobiles.add(user.mobile);
        uniqueResults.push(user);
      }
    }

    res.json({ users: uniqueResults.slice(0, 10) });
  } catch (error) {
    console.error('Search introducers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/update-introducer/:userId
// @desc    Update user's introducer and refresh network relationships
// @access  Private
router.put('/update-introducer/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { introducerId } = req.body;

    // Try to find and update the user in ChannelPartner collection
    let updatedUser = await ChannelPartner.findByIdAndUpdate(
      userId,
      { introducer: introducerId },
      { new: true }
    ).populate('introducer', 'name displayName mobile');

    // If not found in ChannelPartner, try Customer collection
    if (!updatedUser) {
      updatedUser = await Customer.findByIdAndUpdate(
        userId,
        { introducer: introducerId },
        { new: true }
      ).populate('introducer', 'name displayName mobile');
    }

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Introducer updated successfully. Network relationships have been refreshed.',
      user: {
        ...updatedUser.toObject(),
        introducerName: updatedUser.introducer ? (updatedUser.introducer.displayName || updatedUser.introducer.name) : null
      }
    });
  } catch (error) {
    console.error('Update introducer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/update-user-type/:userId
// @desc    Update user type and manage collection membership
// @access  Private
router.put('/update-user-type/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.body;

    // Validate userType
    if (!['CP', 'Customer', 'Both'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    // Try to find user in ChannelPartner collection first
    let existingUser = await ChannelPartner.findById(userId);
    let foundIn = 'ChannelPartner';

    // If not found, try Customer collection
    if (!existingUser) {
      existingUser = await Customer.findById(userId);
      foundIn = 'Customer';
    }

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Store user data for re-creating in other collections
    const userData = {
      name: existingUser.name,
      displayName: existingUser.displayName,
      mobile: existingUser.mobile,
      password: existingUser.password,
      introducer: existingUser.introducer,
      userType: userType,
      referralCode: existingUser.referralCode,
      createdAt: existingUser.createdAt
    };

    // Handle collection updates based on new userType
    if (userType === 'CP') {
      // Should only be in ChannelPartner collection
      if (foundIn === 'Customer') {
        // Delete from Customer, add to ChannelPartner
        await Customer.findByIdAndDelete(userId);
        await ChannelPartner.create({ ...userData, _id: userId });
      } else {
        // Just update the userType in ChannelPartner
        existingUser.userType = userType;
        await existingUser.save();
      }
      // Remove from Customer if exists
      await Customer.findByIdAndDelete(userId);
      
    } else if (userType === 'Customer') {
      // Should only be in Customer collection
      if (foundIn === 'ChannelPartner') {
        // Delete from ChannelPartner, add to Customer
        await ChannelPartner.findByIdAndDelete(userId);
        await Customer.create({ ...userData, _id: userId });
      } else {
        // Just update the userType in Customer
        existingUser.userType = userType;
        await existingUser.save();
      }
      // Remove from ChannelPartner if exists
      await ChannelPartner.findByIdAndDelete(userId);
      
    } else if (userType === 'Both') {
      // Should be in both collections
      // Ensure user exists in ChannelPartner
      const cpExists = await ChannelPartner.findById(userId);
      if (!cpExists) {
        await ChannelPartner.create({ ...userData, _id: userId });
      } else {
        cpExists.userType = userType;
        await cpExists.save();
      }
      
      // Ensure user exists in Customer
      const custExists = await Customer.findById(userId);
      if (!custExists) {
        await Customer.create({ ...userData, _id: userId });
      } else {
        custExists.userType = userType;
        await custExists.save();
      }
    }

    res.json({ 
      message: `User type updated to ${userType} successfully`,
      userType: userType
    });
  } catch (error) {
    console.error('Update user type error:', error);
    res.status(500).json({ message: 'Server error' });
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

    // Search in ChannelPartner collection
    const channelPartners = await ChannelPartner.find({
      mobile: { $regex: mobile, $options: 'i' }
    })
    .select('_id name displayName mobile userType')
    .limit(10);

    // Search in Customer collection
    const customers = await Customer.find({
      mobile: { $regex: mobile, $options: 'i' }
    })
    .select('_id name displayName mobile userType')
    .limit(10);

    // Combine results and remove duplicates by _id
    const allUsers = [...channelPartners, ...customers];
    const uniqueUsers = Array.from(
      new Map(allUsers.map(user => [user._id.toString(), user])).values()
    ).slice(0, 10);

    res.json({ users: uniqueUsers });
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
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, displayName, mobile, userType } = req.body;
    const userId = req.user._id;

    // Try to find user in ChannelPartner collection first
    let user = await ChannelPartner.findById(userId);
    let isChannelPartner = true;

    // If not found, try Customer collection
    if (!user) {
      user = await Customer.findById(userId);
      isChannelPartner = false;
    }

    // If user not found in either collection
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Store old userType for comparison
    const oldUserType = user.userType;

    // Update fields
    if (name) user.name = name;
    if (displayName) user.displayName = displayName;
    if (mobile) user.mobile = mobile;
    if (userType) user.userType = userType;

    // Handle userType change
    if (userType && userType !== oldUserType) {
      // If changing to "both", user should exist in both collections
      if (userType === 'both') {
        // User stays in current collection, just update userType
        await user.save();

        // Check if user exists in other collection, if not create them
        if (isChannelPartner) {
          const existingCustomer = await Customer.findById(userId);
          if (!existingCustomer) {
            const newCustomer = new Customer({
              _id: userId,
              name: user.name,
              displayName: user.displayName,
              mobile: user.mobile,
              password: user.password,
              userType: 'both',
              introducer: user.introducer,
              introducerModel: user.introducerModel,
              createdAt: user.createdAt
            });
            await newCustomer.save();
          } else {
            existingCustomer.userType = 'both';
            await existingCustomer.save();
          }
        } else {
          const existingChannelPartner = await ChannelPartner.findById(userId);
          if (!existingChannelPartner) {
            const newChannelPartner = new ChannelPartner({
              _id: userId,
              name: user.name,
              displayName: user.displayName,
              mobile: user.mobile,
              password: user.password,
              userType: 'both',
              introducer: user.introducer,
              introducerModel: user.introducerModel,
              createdAt: user.createdAt
            });
            await newChannelPartner.save();
          } else {
            existingChannelPartner.userType = 'both';
            await existingChannelPartner.save();
          }
        }
      } 
      // If changing from "both" to specific type, just update userType
      else if (oldUserType === 'both') {
        user.userType = userType;
        await user.save();

        // Update in other collection too if exists
        if (isChannelPartner && userType === 'channelpartner') {
          const customerUser = await Customer.findById(userId);
          if (customerUser) {
            customerUser.userType = userType;
            await customerUser.save();
          }
        } else if (!isChannelPartner && userType === 'customer') {
          const channelPartnerUser = await ChannelPartner.findById(userId);
          if (channelPartnerUser) {
            channelPartnerUser.userType = userType;
            await channelPartnerUser.save();
          }
        }
      }
      // Normal type change (channelpartner <-> customer)
      else {
        user.userType = userType;
        await user.save();
      }
    } else {
      await user.save();
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        displayName: user.displayName,
        userType: user.userType,
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

    // Helper function to find referrals in all collections
    const findReferralsInAllCollections = async (introducerId) => {
      const channelPartners = await ChannelPartner.find({ introducer: introducerId })
        .select('_id name displayName createdAt introducer introducerName userType')
        .sort({ createdAt: -1 });
      
      const customers = await Customer.find({ introducer: introducerId })
        .select('_id name displayName createdAt introducer introducerName userType')
        .sort({ createdAt: -1 });
      
      return [...channelPartners, ...customers];
    };

    // Helper function to recursively find all referrals at each level
    async function getReferralChain(introducerId, level = 1, introducerName = '') {
      const directReferrals = await findReferralsInAllCollections(introducerId);

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

    // Search in ChannelPartner collection
    const channelPartners = await ChannelPartner.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query, $options: 'i' } }
      ]
    })
    .select('_id name displayName mobile userType')
    .limit(20)
    .sort({ name: 1 });

    // Search in Customer collection
    const customers = await Customer.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query, $options: 'i' } }
      ]
    })
    .select('_id name displayName mobile userType')
    .limit(20)
    .sort({ name: 1 });

    // Search in old User collection
    const oldUsers = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query, $options: 'i' } }
      ]
    })
    .select('_id name displayName mobile')
    .limit(20)
    .sort({ name: 1 });

    // Combine results and remove duplicates
    const allUsers = [...channelPartners, ...customers, ...oldUsers];
    const uniqueUsers = Array.from(
      new Map(allUsers.map(user => [user._id.toString(), user])).values()
    ).slice(0, 20);

    res.json({ users: uniqueUsers });
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

    // Helper function to find user in any collection (prioritize ChannelPartner > Customer)
    const findUserInAnyCollection = async (userId) => {
      let user = await ChannelPartner.findById(userId).select('name displayName mobile createdAt userType');
      if (user) return user;
      
      user = await Customer.findById(userId).select('name displayName mobile createdAt userType');
      return user;
    };

    // Helper function to find referrals in all collections (deduplicated by mobile number)
    const findReferralsInAllCollections = async (introducerId) => {
      const channelPartners = await ChannelPartner.find({ introducer: introducerId }).select('_id name displayName mobile createdAt userType');
      const customers = await Customer.find({ introducer: introducerId }).select('_id name displayName mobile createdAt userType');
      
      // Combine all users and deduplicate by mobile number
      const allUsers = [...channelPartners, ...customers];
      const uniqueUsers = [];
      const seenMobiles = new Set();
      
      for (const user of allUsers) {
        if (!seenMobiles.has(user.mobile)) {
          seenMobiles.add(user.mobile);
          // Prioritize ChannelPartner > Customer > User for userType
          uniqueUsers.push(user);
        }
      }
      
      return uniqueUsers;
    };

    // Verify user exists
    const targetUser = await findUserInAnyCollection(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Helper function to calculate branch levels for a specific user's referral chain with CP/Customer breakdown
    const calculateBranchLevels = async (userId) => {
      const levels = {
        level2: { cp: 0, customer: 0, total: 0 }, 
        level3: { cp: 0, customer: 0, total: 0 }, 
        level4: { cp: 0, customer: 0, total: 0 }, 
        level5: { cp: 0, customer: 0, total: 0 }, 
        level6: { cp: 0, customer: 0, total: 0 },
        totalCp: 0,
        totalCustomer: 0,
        grandTotal: 0
      };
      
      // Helper function to count CP and Customer users
      const countUserTypes = (users) => {
        let cp = 0, customer = 0;
        users.forEach(user => {
          if (user.userType === 'CP') cp++;
          else if (user.userType === 'Customer') customer++;
          else if (user.userType === 'Both') {
            cp++; customer++;
          } else {
            // Default for old users without userType
            customer++;
          }
        });
        return { cp, customer, total: users.length };
      };
      
      // Level 2: Direct referrals of this user
      const level2Users = await findReferralsInAllCollections(userId);
      const level2Counts = countUserTypes(level2Users);
      levels.level2 = level2Counts;
      
      if (level2Users.length > 0) {
        // Level 3: Referrals of Level 2 users
        const level2Ids = level2Users.map(u => u._id);
        let level3Users = [];
        for (const id of level2Ids) {
          const referrals = await findReferralsInAllCollections(id);
          level3Users = level3Users.concat(referrals);
        }
        const level3Counts = countUserTypes(level3Users);
        levels.level3 = level3Counts;
        
        if (level3Users.length > 0) {
          // Level 4: Referrals of Level 3 users
          const level3Ids = level3Users.map(u => u._id);
          let level4Users = [];
          for (const id of level3Ids) {
            const referrals = await findReferralsInAllCollections(id);
            level4Users = level4Users.concat(referrals);
          }
          const level4Counts = countUserTypes(level4Users);
          levels.level4 = level4Counts;
          
          if (level4Users.length > 0) {
            // Level 5: Referrals of Level 4 users
            const level4Ids = level4Users.map(u => u._id);
            let level5Users = [];
            for (const id of level4Ids) {
              const referrals = await findReferralsInAllCollections(id);
              level5Users = level5Users.concat(referrals);
            }
            const level5Counts = countUserTypes(level5Users);
            levels.level5 = level5Counts;
            
            if (level5Users.length > 0) {
              // Level 6: Referrals of Level 5 users
              const level5Ids = level5Users.map(u => u._id);
              let level6Users = [];
              for (const id of level5Ids) {
                const referrals = await findReferralsInAllCollections(id);
                level6Users = level6Users.concat(referrals);
              }
              const level6Counts = countUserTypes(level6Users);
              levels.level6 = level6Counts;
            }
          }
        }
      }
      
      // Calculate totals
      levels.totalCp = levels.level2.cp + levels.level3.cp + levels.level4.cp + levels.level5.cp + levels.level6.cp;
      levels.totalCustomer = levels.level2.customer + levels.level3.customer + levels.level4.customer + levels.level5.customer + levels.level6.customer;
      levels.grandTotal = levels.totalCp + levels.totalCustomer;
      
      return levels;
    };

    // Get direct referrals (Level 1 users)
    const level1Users = await findReferralsInAllCollections(targetUser._id);

    const branches = [];

    // Add target user as first branch with their total network counts
    const rootBranchData = await calculateBranchLevels(targetUser._id);
    branches.push({
      id: targetUser._id,
      name: targetUser.name,
      displayName: targetUser.displayName,
      mobile: targetUser.mobile,
      joinDate: targetUser.createdAt,
      userType: targetUser.userType || 'Customer',
      isRoot: true,
      level2: rootBranchData.level2,
      level3: rootBranchData.level3,
      level4: rootBranchData.level4,
      level5: rootBranchData.level5,
      level6: rootBranchData.level6,
      totalCp: rootBranchData.totalCp,
      totalCustomer: rootBranchData.totalCustomer,
      totalUsers: rootBranchData.grandTotal
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
        userType: level1User.userType || 'Customer',
        isRoot: false,
        level2: branchData.level2,
        level3: branchData.level3,
        level4: branchData.level4,
        level5: branchData.level5,
        level6: branchData.level6,
        totalCp: branchData.totalCp,
        totalCustomer: branchData.totalCustomer,
        totalUsers: branchData.grandTotal
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
    const { userType } = req.query; // CP, Customer, or undefined for all
    const levelNum = parseInt(level);

    if (levelNum < 2 || levelNum > 6) {
      return res.status(400).json({ message: 'Level must be between 2 and 6' });
    }

    // Helper function to find user in any collection
    const findUserInAnyCollection = async (userId) => {
      let user = await ChannelPartner.findById(userId).select('name displayName mobile userType');
      if (user) return user;
      
      user = await Customer.findById(userId).select('name displayName mobile userType');
      return user;
    };

    // Get the branch user
    const branchUser = await findUserInAnyCollection(branchUserId);
    if (!branchUser) {
      return res.status(404).json({ message: 'Branch user not found' });
    }

    let users = [];
    let currentLevelIds = [branchUserId];

    // Navigate through levels to reach the target level
    for (let i = 1; i < levelNum; i++) {
      const cpUsers = await ChannelPartner.find({
        introducer: { $in: currentLevelIds }
      }).select('_id');
      
      const customerUsers = await Customer.find({
        introducer: { $in: currentLevelIds }
      }).select('_id');
      
      currentLevelIds = [...cpUsers.map(u => u._id), ...customerUsers.map(u => u._id)];
      
      if (currentLevelIds.length === 0) break;
    }

    // Get full user details at the target level
    if (currentLevelIds.length > 0) {
      let cpUsers = [];
      let customerUsers = [];

      if (!userType || userType === 'CP') {
        cpUsers = await ChannelPartner.find({
          _id: { $in: currentLevelIds }
        }).select('name displayName mobile createdAt introducerName userType')
          .sort({ createdAt: -1 });
      }

      if (!userType || userType === 'Customer') {
        customerUsers = await Customer.find({
          _id: { $in: currentLevelIds }
        }).select('name displayName mobile createdAt introducerName userType')
          .sort({ createdAt: -1 });
      }

      users = [...cpUsers, ...customerUsers];
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
      totalUsers: users.length,
      userType: userType || 'All'
    });

  } catch (error) {
    console.error('Get level users error:', error);
    res.status(500).json({ message: 'Server error fetching level users' });
  }
});

// @route   GET /api/users/ranking
// @desc    Get top users ranking by total referrals with pagination
// @access  Private
router.get('/ranking', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Helper function to calculate total referrals for a user (all 6 levels)
    const calculateTotalReferrals = async (userId) => {
      let total = 0;
      let currentLevelIds = [userId];

      // Iterate through 6 levels
      for (let level = 1; level <= 6; level++) {
        const nextLevelUsers = await User.find({
          introducer: { $in: currentLevelIds }
        }).select('_id');
        
        total += nextLevelUsers.length;
        currentLevelIds = nextLevelUsers.map(u => u._id);
        
        if (currentLevelIds.length === 0) break;
      }

      return total;
    };

    // Get all users
    const allUsers = await User.find({}).select('_id name displayName mobile createdAt');

    // Calculate total referrals for each user
    const usersWithReferrals = await Promise.all(
      allUsers.map(async (user) => {
        const totalReferrals = await calculateTotalReferrals(user._id);
        return {
          _id: user._id,
          name: user.name,
          displayName: user.displayName,
          mobile: user.mobile,
          createdAt: user.createdAt,
          totalReferrals
        };
      })
    );

    // Sort by total referrals (descending)
    usersWithReferrals.sort((a, b) => b.totalReferrals - a.totalReferrals);

    // Add ranking
    const rankedUsers = usersWithReferrals.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    // Paginate
    const paginatedUsers = rankedUsers.slice(skip, skip + limit);
    const totalUsers = rankedUsers.length;
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      users: paginatedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get ranking error:', error);
    res.status(500).json({ message: 'Server error fetching ranking' });
  }
});

module.exports = router;