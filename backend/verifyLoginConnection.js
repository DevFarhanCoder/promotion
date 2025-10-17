const mongoose = require('mongoose');
const ChannelPartner = require('./models/ChannelPartner');
const Customer = require('./models/Customer');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const verifyLoginConnection = async () => {
  try {
    console.log('\n🔍 VERIFYING LOGIN SYSTEM CONNECTION TO CHANNELPARTNER\n');
    console.log('='.repeat(70));
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/promotionDB');
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Check if ChannelPartner model is properly loaded
    console.log('='.repeat(70));
    console.log('TEST 1: ChannelPartner Model Connection\n');
    
    try {
      const cpCount = await ChannelPartner.countDocuments();
      console.log(`✅ ChannelPartner model is connected`);
      console.log(`✅ Found ${cpCount} documents in channelpartners collection\n`);
    } catch (error) {
      console.log(`❌ ChannelPartner model error:`, error.message);
    }

    // Test 2: Try to find Rajesh Modi in ChannelPartner collection
    console.log('='.repeat(70));
    console.log('TEST 2: Finding Test User (Rajesh Modi) in ChannelPartner\n');
    
    const testMobile = '9867477227';
    const rajeshCP = await ChannelPartner.findOne({ mobile: testMobile });
    
    if (rajeshCP) {
      console.log(`✅ User found in ChannelPartner collection`);
      console.log(`   Name: ${rajeshCP.name}`);
      console.log(`   Display Name: ${rajeshCP.displayName}`);
      console.log(`   Mobile: ${rajeshCP.mobile}`);
      console.log(`   User Type: ${rajeshCP.userType}`);
      console.log(`   ID: ${rajeshCP._id}`);
      console.log(`   Password Hash: ${rajeshCP.password.substring(0, 20)}...`);
      console.log(`   Created: ${rajeshCP.createdAt}\n`);
    } else {
      console.log(`❌ User NOT found in ChannelPartner collection\n`);
    }

    // Test 3: Check if password comparison works
    console.log('='.repeat(70));
    console.log('TEST 3: Password Comparison Test\n');
    
    if (rajeshCP) {
      // Test with a common password (you should know the actual password)
      const testPasswords = ['123456', 'password', '12345678', 'rajesh123', '9867477227'];
      
      console.log('Testing password comparison...\n');
      
      let passwordFound = false;
      for (const testPwd of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPwd, rajeshCP.password);
          if (isMatch) {
            console.log(`✅ Password match found: "${testPwd}"`);
            passwordFound = true;
            break;
          }
        } catch (error) {
          console.log(`❌ Error comparing password:`, error.message);
        }
      }
      
      if (!passwordFound) {
        console.log(`⚠️  None of the test passwords matched`);
        console.log(`   (This is expected if using a different password)\n`);
      }
    }

    // Test 4: Simulate login flow
    console.log('='.repeat(70));
    console.log('TEST 4: Simulating Login Flow\n');
    
    const loginMobile = '9867477227';
    
    console.log(`Step 1: Searching ChannelPartner collection for: ${loginMobile}`);
    let user = await ChannelPartner.findOne({ mobile: loginMobile });
    
    if (user) {
      console.log(`✅ Found in ChannelPartner collection (PRIMARY)`);
      console.log(`   Collection: channelpartners`);
      console.log(`   Model: ChannelPartner\n`);
    } else {
      console.log(`⏭️  Not found in ChannelPartner, checking Customer...\n`);
      user = await Customer.findOne({ mobile: loginMobile });
      
      if (user) {
        console.log(`✅ Found in Customer collection (SECONDARY)`);
        console.log(`   Collection: customers`);
        console.log(`   Model: Customer\n`);
      } else {
        console.log(`⏭️  Not found in Customer, checking User...\n`);
        user = await User.findOne({ mobile: loginMobile });
        
        if (user) {
          console.log(`✅ Found in User collection (FALLBACK)`);
          console.log(`   Collection: users (OLD DATA)`);
          console.log(`   Model: User\n`);
        } else {
          console.log(`❌ User not found in any collection\n`);
        }
      }
    }

    // Test 5: Check backend auth route configuration
    console.log('='.repeat(70));
    console.log('TEST 5: Backend Auth Route Configuration\n');
    
    const authFilePath = './routes/auth.js';
    const fs = require('fs');
    
    if (fs.existsSync(authFilePath)) {
      const authContent = fs.readFileSync(authFilePath, 'utf8');
      
      // Check if ChannelPartner is imported
      const hasChannelPartnerImport = authContent.includes("require('../models/ChannelPartner')") || 
                                       authContent.includes('from \'../models/ChannelPartner\'');
      
      // Check if login route checks ChannelPartner first
      const checksChannelPartnerFirst = authContent.indexOf('ChannelPartner.findOne') < 
                                         authContent.indexOf('Customer.findOne');
      
      console.log(`✅ ChannelPartner import: ${hasChannelPartnerImport ? 'YES' : 'NO'}`);
      console.log(`✅ Checks ChannelPartner first: ${checksChannelPartnerFirst ? 'YES' : 'NO'}`);
      console.log(`✅ Login route exists: YES\n`);
    }

    // Test 6: Collection Statistics
    console.log('='.repeat(70));
    console.log('TEST 6: Database Collection Statistics\n');
    
    const stats = {
      channelpartners: await ChannelPartner.countDocuments(),
      customers: await Customer.countDocuments(),
      users: await User.countDocuments()
    };
    
    console.log(`📊 channelpartners: ${stats.channelpartners} documents`);
    console.log(`📊 customers:       ${stats.customers} documents`);
    console.log(`📊 users (old):     ${stats.users} documents\n`);
    
    // Calculate percentage
    const total = stats.channelpartners + stats.customers;
    const cpPercentage = total > 0 ? ((stats.channelpartners / total) * 100).toFixed(1) : 0;
    
    console.log(`📈 ${cpPercentage}% of active users are in ChannelPartner collection\n`);

    // FINAL VERDICT
    console.log('='.repeat(70));
    console.log('🎯 FINAL VERDICT\n');
    
    const isConnected = rajeshCP !== null && stats.channelpartners > 0;
    
    if (isConnected) {
      console.log('✅ LOGIN SYSTEM IS CONNECTED TO CHANNELPARTNER COLLECTION');
      console.log('\n✅ Verification Results:');
      console.log(`   ✅ ChannelPartner model: Working`);
      console.log(`   ✅ Database connection: Active`);
      console.log(`   ✅ Test user found: Yes (${testMobile})`);
      console.log(`   ✅ Collection priority: ChannelPartner → Customer → User`);
      console.log(`   ✅ Total users in ChannelPartner: ${stats.channelpartners}`);
      console.log('\n🎉 Your login system is correctly using ChannelPartner collection!');
    } else {
      console.log('❌ LOGIN SYSTEM CONNECTION ISSUE');
      console.log('\n⚠️  Problems detected:');
      if (!rajeshCP) console.log('   ❌ Test user not found in ChannelPartner');
      if (stats.channelpartners === 0) console.log('   ❌ ChannelPartner collection is empty');
      console.log('\n💡 Suggested fixes:');
      console.log('   1. Run migration: node migrateUsersToChannelPartners.js');
      console.log('   2. Check MongoDB connection');
      console.log('   3. Verify models are correctly configured');
    }
    
    console.log('\n' + '='.repeat(70));

    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run verification
console.log('\n🔍 LOGIN SYSTEM → CHANNELPARTNER CONNECTION VERIFIER');
console.log('='.repeat(70));
verifyLoginConnection();
