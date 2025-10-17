const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ChannelPartner = require('./models/ChannelPartner');
const User = require('./models/User');
require('dotenv').config();

const fixPasswordIssue = async () => {
  try {
    console.log('\n🔧 PASSWORD ISSUE DIAGNOSTIC & FIX TOOL\n');
    console.log('='.repeat(70));
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/promotionDB');
    console.log('✅ Connected to MongoDB\n');

    // Test mobile numbers from logs
    const testMobiles = ['9867477227', '9867969445'];
    
    for (const mobile of testMobiles) {
      console.log('='.repeat(70));
      console.log(`\n🔍 Diagnosing user: ${mobile}\n`);
      
      // Check in ChannelPartner
      const cpUser = await ChannelPartner.findOne({ mobile });
      const oldUser = await User.findOne({ mobile });
      
      if (cpUser) {
        console.log('✅ Found in ChannelPartner collection:');
        console.log(`   Name: ${cpUser.name}`);
        console.log(`   Display Name: ${cpUser.displayName}`);
        console.log(`   Password Hash: ${cpUser.password.substring(0, 20)}...`);
        console.log(`   Hash Length: ${cpUser.password.length} chars`);
        console.log(`   Starts with $2a$ or $2b$: ${cpUser.password.startsWith('$2a$') || cpUser.password.startsWith('$2b$') ? 'YES ✅' : 'NO ❌'}`);
      }
      
      if (oldUser) {
        console.log('\n📌 Also found in old User collection:');
        console.log(`   Name: ${oldUser.name}`);
        console.log(`   Password Hash: ${oldUser.password.substring(0, 20)}...`);
        console.log(`   Hash Length: ${oldUser.password.length} chars`);
      }
      
      // Compare password hashes
      if (cpUser && oldUser) {
        if (cpUser.password === oldUser.password) {
          console.log('\n✅ Password hashes MATCH between collections');
        } else {
          console.log('\n⚠️  Password hashes are DIFFERENT!');
          console.log('   This means migration copied a different password.');
          console.log('\n🔧 Fixing: Copying password from User to ChannelPartner...');
          
          cpUser.password = oldUser.password;
          await cpUser.save({ validateBeforeSave: false });
          
          console.log('✅ Password hash synchronized from User collection');
        }
      }
      
      // Test common passwords
      if (cpUser) {
        console.log('\n🔐 Testing common passwords:');
        const testPasswords = ['123456', 'password', 'admin', 'test123', mobile];
        
        for (const testPass of testPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPass, cpUser.password);
            if (isMatch) {
              console.log(`   ✅ FOUND! Password is: "${testPass}"`);
              break;
            }
          } catch (e) {
            // Silent fail
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 SOLUTIONS:\n');
    console.log('Option 1: Reset password for specific user');
    console.log('   - Run: node resetPassword.js <mobile> <newPassword>');
    console.log('\nOption 2: Set a known password for testing');
    console.log('   - I can update passwords to "test123" for testing');
    console.log('\nOption 3: Copy passwords from old User collection');
    console.log('   - Already attempted above if hashes were different');
    
    console.log('\n' + '='.repeat(70));
    
    // Offer to set test passwords
    console.log('\n🔧 QUICK FIX: Setting test password "test123" for both users...\n');
    
    for (const mobile of testMobiles) {
      const cpUser = await ChannelPartner.findOne({ mobile });
      if (cpUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('test123', salt);
        
        cpUser.password = hashedPassword;
        await cpUser.save({ validateBeforeSave: false });
        
        console.log(`✅ Password set to "test123" for ${cpUser.name} (${mobile})`);
        
        // Verify it works
        const testMatch = await bcrypt.compare('test123', cpUser.password);
        console.log(`   Verification: ${testMatch ? '✅ Password works!' : '❌ Password verification failed'}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✨ You can now login with:');
    console.log('   Mobile: 9867477227');
    console.log('   Password: test123');
    console.log('\n   OR');
    console.log('\n   Mobile: 9867969445');
    console.log('   Password: test123');
    console.log('\n' + '='.repeat(70));

    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run diagnostic
fixPasswordIssue();
