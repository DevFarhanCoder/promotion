const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ChannelPartner = require('./models/ChannelPartner');
const User = require('./models/User');
require('dotenv').config();

const synchronizePasswords = async () => {
  try {
    console.log('\n🔧 PASSWORD SYNCHRONIZATION TOOL\n');
    console.log('='.repeat(70));
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/promotionDB');
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(70));
    console.log('STRATEGY: Copy exact password hashes from User → ChannelPartner');
    console.log('(This bypasses the pre-save hook that re-hashes passwords)');
    console.log('='.repeat(70));
    console.log('');

    // Get all users from ChannelPartner collection
    const channelPartners = await ChannelPartner.find({});
    
    console.log(`\n📊 Found ${channelPartners.length} users in ChannelPartner collection\n`);
    
    let syncedCount = 0;
    let notFoundCount = 0;
    
    for (const cpUser of channelPartners) {
      // Find corresponding user in old User collection
      const oldUser = await User.findOne({ mobile: cpUser.mobile });
      
      if (oldUser) {
        // Check if passwords are different
        if (cpUser.password !== oldUser.password) {
          // Update directly without triggering pre-save hook
          await ChannelPartner.updateOne(
            { _id: cpUser._id },
            { $set: { password: oldUser.password } }
          );
          
          console.log(`✅ Synced password for: ${cpUser.name} (${cpUser.mobile})`);
          syncedCount++;
        } else {
          console.log(`⏭️  Already synced: ${cpUser.name} (${cpUser.mobile})`);
        }
      } else {
        console.log(`⚠️  No matching user in old collection: ${cpUser.name} (${cpUser.mobile})`);
        notFoundCount++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 SYNCHRONIZATION SUMMARY:');
    console.log('='.repeat(70));
    console.log(`✅ Passwords synchronized: ${syncedCount}`);
    console.log(`⏭️  Already in sync: ${channelPartners.length - syncedCount - notFoundCount}`);
    console.log(`⚠️  Not found in old collection: ${notFoundCount}`);
    console.log(`📈 Total processed: ${channelPartners.length}`);
    console.log('='.repeat(70));
    
    if (syncedCount > 0) {
      console.log('\n✨ Password synchronization completed successfully!');
      console.log('\n💡 You can now login with your ORIGINAL passwords');
      console.log('   (The same passwords you used before migration)');
    }
    
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

// Run synchronization
synchronizePasswords();
