const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const channelPartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    minlength: [2, 'Display name must be at least 2 characters long'],
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  introducer: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'introducerModel'
  },
  introducerModel: {
    type: String,
    enum: ['ChannelPartner', 'Customer', 'User']
  },
  introducerMobile: {
    type: String
  },
  introducerName: {
    type: String
  },
  userType: {
    type: String,
    default: 'CP',
    enum: ['CP', 'Both']
  }
}, {
  timestamps: true
});

// Hash password before saving
channelPartnerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
channelPartnerSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Don't return password in JSON
channelPartnerSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('ChannelPartner', channelPartnerSchema, 'channelpartners');
