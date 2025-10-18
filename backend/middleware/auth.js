const jwt = require('jsonwebtoken');
const ChannelPartner = require('../models/ChannelPartner');
const Customer = require('../models/Customer');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token and catch specific JWT errors
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        console.log('⏰ Token expired at:', jwtError.expiredAt);
        return res.status(401).json({ 
          message: 'Session expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        console.log('❌ Invalid token:', jwtError.message);
        return res.status(401).json({ 
          message: 'Invalid token. Please login again.',
          code: 'INVALID_TOKEN'
        });
      }
      throw jwtError;
    }
    
    // Check in ChannelPartner collection first
    let user = await ChannelPartner.findById(decoded.userId);
    
    // If not found, check Customer collection
    if (!user) {
      user = await Customer.findById(decoded.userId);
    }
    
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found. Please login again.',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      message: 'Authentication failed. Please login again.',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = auth;