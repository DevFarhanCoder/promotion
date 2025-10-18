const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Import models
const ChannelPartner = require('./models/ChannelPartner');
const Customer = require('./models/Customer');

async function fixPlainTextPasswords() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    console.log('📍 MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'NOT FOUND');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check and fix ChannelPartner passwords
    console.log('\n📋 Checking ChannelPartner passwords...');
    const channelPartners = await ChannelPartner.find({});
    let cpFixed = 0;

    for (const cp of channelPartners) {
      // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
      if (!cp.password.startsWith('$2a$') && !cp.password.startsWith('$2b$')) {
        console.log(`🔄 Hashing password for: ${cp.displayName} (${cp.mobile})`);
        const plainPassword = cp.password;
        const salt = await bcrypt.genSalt(10);
        cp.password = await bcrypt.hash(plainPassword, salt);
        
        // Update directly without triggering pre-save hook
        await ChannelPartner.updateOne(
          { _id: cp._id },
          { $set: { password: cp.password } }
        );
        
        cpFixed++;
        console.log(`✅ Fixed password for: ${cp.displayName}`);
      } else {
        console.log(`✓ Password already hashed for: ${cp.displayName}`);
      }
    }

    // Check and fix Customer passwords
    console.log('\n📋 Checking Customer passwords...');
    const customers = await Customer.find({});
    let custFixed = 0;

    for (const customer of customers) {
      // Check if password is already hashed
      if (!customer.password.startsWith('$2a$') && !customer.password.startsWith('$2b$')) {
        console.log(`🔄 Hashing password for: ${customer.displayName} (${customer.mobile})`);
        const plainPassword = customer.password;
        const salt = await bcrypt.genSalt(10);
        customer.password = await bcrypt.hash(plainPassword, salt);
        
        // Update directly without triggering pre-save hook
        await Customer.updateOne(
          { _id: customer._id },
          { $set: { password: customer.password } }
        );
        
        custFixed++;
        console.log(`✅ Fixed password for: ${customer.displayName}`);
      } else {
        console.log(`✓ Password already hashed for: ${customer.displayName}`);
      }
    }

    console.log('\n✨ Password Fix Summary:');
    console.log(`- ChannelPartners fixed: ${cpFixed}/${channelPartners.length}`);
    console.log(`- Customers fixed: ${custFixed}/${customers.length}`);
    console.log('✅ All passwords have been secured!');

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the script
fixPlainTextPasswords();
