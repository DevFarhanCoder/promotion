const express = require('express');
const jwt = require('jsonwebtoken');
const ChannelPartner = require('../models/ChannelPartner');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/signup
// @desc    Register user (initial signup without user type)
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { name, mobile, displayName, password, introducerId, introducerMobile, introducerName, userType } = req.body;

    console.log('📝 Signup attempt:', {
      name,
      mobile,
      displayName,
      introducerId,
      introducerName,
      userType
    });

    // Validate introducer is provided
    if (!introducerId || !introducerMobile || !introducerName) {
      return res.status(400).json({ message: 'Introducer is required. Please select a referral member.' });
    }

    // Normalize and validate user type
    const normalizedUserType = userType ? userType.toLowerCase() : '';
    console.log('🔄 Normalized userType:', normalizedUserType);
    
    if (!normalizedUserType || !['channelpartner', 'customer', 'both'].includes(normalizedUserType)) {
      return res.status(400).json({ message: 'Please select your user type' });
    }

    // Check if user already exists in any collection
    const existingChannelPartner = await ChannelPartner.findOne({ mobile });
    const existingCustomer = await Customer.findOne({ mobile });
    
    if (existingChannelPartner || existingCustomer) {
      return res.status(400).json({ message: 'User with this mobile number already exists' });
    }

    // Check if introducer exists (flexible lookup)
    let introducer;
    let introducerModel;
    
    try {
      // First check ChannelPartner collection
      introducer = await ChannelPartner.findById(introducerId);
      if (introducer) {
        introducerModel = 'ChannelPartner';
        console.log('✅ Introducer found in ChannelPartner collection:', introducer.displayName);
      } else {
        // Then check Customer collection
        introducer = await Customer.findById(introducerId);
        if (introducer) {
          introducerModel = 'Customer';
          console.log('✅ Introducer found in Customer collection:', introducer.displayName);
        }
      }
    } catch (introducerError) {
      console.error('❌ Error finding introducer:', introducerError.message);
      return res.status(400).json({ message: 'Invalid introducer ID format. Please select a valid referral member.' });
    }

    if (!introducer) {
      console.log('❌ Introducer not found with ID:', introducerId);
      return res.status(400).json({ message: 'Introducer not found. Please select a valid referral member.' });
    }

    // Map userType to the format expected by models
    let modelUserType;
    if (normalizedUserType === 'channelpartner') {
      modelUserType = 'CP';
    } else if (normalizedUserType === 'customer') {
      modelUserType = 'Customer';
    } else if (normalizedUserType === 'both') {
      modelUserType = 'Both';
    }

    // Create user object
    const userData = {
      name,
      mobile,
      displayName,
      password,
      introducer: introducerId,
      introducerModel,
      introducerMobile,
      introducerName,
      userType: modelUserType
    };

    console.log('📦 User data prepared:', {
      ...userData,
      password: '***HIDDEN***'
    });

    let savedUser;
    let token;

    try {
      // Save to appropriate collection(s) based on userType
      if (normalizedUserType === 'channelpartner' || normalizedUserType === 'both') {
        console.log('💼 Creating ChannelPartner with data:', userData);
        const channelPartner = new ChannelPartner(userData);
        savedUser = await channelPartner.save();
        token = generateToken(savedUser._id);
        console.log('✅ ChannelPartner saved successfully:', savedUser._id);
      }

      if (normalizedUserType === 'customer' || normalizedUserType === 'both') {
        console.log('👤 Creating Customer with data:', userData);
        const customer = new Customer(userData);
        const savedCustomer = await customer.save();
        console.log('✅ Customer saved successfully:', savedCustomer._id);
        
        // If not already set (for 'Both' case, use channel partner token)
        if (!savedUser) {
          savedUser = savedCustomer;
          token = generateToken(savedCustomer._id);
        }
      }
    } catch (saveError) {
      console.error('Error saving user:', saveError);
      
      // If duplicate key error on second save (for 'both' type), that's expected
      if (saveError.code === 11000 && normalizedUserType === 'both') {
        console.log('⚠️ Duplicate key on second collection (expected for "both" type)');
        // Continue with the first saved user
      } else {
        // Re-throw other errors
        throw saveError;
      }
    }

    console.log('🎉 Signup successful for:', savedUser.displayName);

    // Ensure we have a saved user
    if (!savedUser || !token) {
      throw new Error('Failed to create user account. Please try again.');
    }

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        mobile: savedUser.mobile,
        displayName: savedUser.displayName,
        introducerName: savedUser.introducerName,
        userType: savedUser.userType
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    console.error('📋 Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      errors: error.errors
    });
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      console.error('Validation errors:', errors);
      return res.status(400).json({ message: errors.join(', ') });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      const value = error.keyValue ? error.keyValue[field] : '';
      console.error(`Duplicate key error on ${field}: ${value}`);
      return res.status(400).json({ 
        message: `This ${field} (${value}) is already registered. Please use a different ${field}.` 
      });
    }

    // Handle cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
      console.error('Cast error:', error.message);
      return res.status(400).json({ message: 'Invalid ID format provided' });
    }

    res.status(500).json({ 
      message: 'Server error during registration. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (PRIMARY: ChannelPartner collection)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;

    console.log('🔐 Login attempt for mobile:', mobile);

    // Validate input
    if (!mobile || !password) {
      return res.status(400).json({ message: 'Mobile number and password are required' });
    }

    // PRIMARY: Check ChannelPartner collection first
    let user = await ChannelPartner.findOne({ mobile });
    let userType = 'CP';
    let collection = 'ChannelPartner';
    
    // SECONDARY: Check Customer collection
    if (!user) {
      user = await Customer.findOne({ mobile });
      userType = 'Customer';
      collection = 'Customer';
    }
    
    if (!user) {
      console.log('❌ User not found with mobile:', mobile);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`✅ User found in ${collection} collection:`, user.name, `(${user.displayName})`);

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', mobile);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('🎉 Login successful for:', user.name);

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        displayName: user.displayName,
        userType: user.userType || userType,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        mobile: req.user.mobile,
        displayName: req.user.displayName
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;