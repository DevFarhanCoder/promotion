const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection string - using MONGODB_URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-connection-string';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('\nPlease ensure:');
    console.log('1. .env file exists in backend folder');
    console.log('2. MONGODB_URI is set in .env file');
    process.exit(1);
  });

// Define User Schema (same as in models/User.js but without introducer requirement)
const userSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  displayName: String,
  password: String,
  profilePhoto: String,
  introducer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make optional for this script
  },
  introducerMobile: String,
  introducerName: String
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function addDefaultIntroducer() {
  try {
    // Check if user with this mobile already exists
    const existingUser = await User.findOne({ mobile: '9867477227' });
    
    if (existingUser) {
      console.log('✓ User with mobile 9867477227 already exists!');
      console.log('User Details:');
      console.log('- ID:', existingUser._id);
      console.log('- Name:', existingUser.name);
      console.log('- Display Name:', existingUser.displayName);
      console.log('- Mobile:', existingUser.mobile);
      console.log('\nYou can use this user as an introducer for new registrations.');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt); // Default password

    // Create default introducer user
    const defaultIntroducer = new User({
      name: 'System Admin',
      mobile: '9867477227',
      displayName: 'System Admin',
      password: hashedPassword,
      profilePhoto: null
      // No introducer fields for this default user
    });

    await defaultIntroducer.save();

    console.log('✓ Default introducer user created successfully!');
    console.log('\nUser Details:');
    console.log('- ID:', defaultIntroducer._id);
    console.log('- Name:', defaultIntroducer.name);
    console.log('- Display Name:', defaultIntroducer.displayName);
    console.log('- Mobile:', defaultIntroducer.mobile);
    console.log('- Password: 123456 (default)');
    console.log('\n✓ This user can now be used as an introducer for new registrations!');
    console.log('✓ Users can search for mobile: 9867477227 when signing up.');

    process.exit(0);

  } catch (error) {
    console.error('Error adding default introducer:', error);
    process.exit(1);
  }
}

// Run the function
addDefaultIntroducer();
