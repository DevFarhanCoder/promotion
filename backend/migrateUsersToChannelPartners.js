const mongoose = require('mongoose');
const User = require('./models/User');
const ChannelPartner = require('./models/ChannelPartner');
require('dotenv').config();

const migrateUsersToChannelPartners = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/promotionDB');
    console.log('✅ Connected to MongoDB');

    // Get all users from users collection
    const users = await User.find({});
    console.log(`\n📊 Found ${users.length} users in 'users' collection`);

    if (users.length === 0) {
      console.log('⚠️  No users to migrate');
      await mongoose.connection.close();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('\n🔄 Starting migration...\n');

    for (const user of users) {
      try {
        // Check if user already exists in channelpartners
        const existingChannelPartner = await ChannelPartner.findOne({ 
          $or: [
            { _id: user._id },
            { mobile: user.mobile }
          ]
        });

        if (existingChannelPartner) {
          console.log(`⏭️  Skipping: ${user.name} (${user.mobile}) - Already exists in channelpartners`);
          skippedCount++;
          continue;
        }

        // Determine introducerModel based on introducer's existence
        let introducerModel = 'User';
        if (user.introducer) {
          // Check if introducer exists in ChannelPartner collection
          const cpIntroducer = await ChannelPartner.findById(user.introducer);
          if (cpIntroducer) {
            introducerModel = 'ChannelPartner';
          } else {
            // Check if introducer exists in User collection
            const userIntroducer = await User.findById(user.introducer);
            if (userIntroducer) {
              introducerModel = 'User';
            }
          }
        }

        // Create new channel partner with same _id to maintain referral relationships
        const channelPartnerData = {
          _id: user._id, // Keep same ID to maintain referral links
          name: user.name,
          displayName: user.displayName || user.name,
          mobile: user.mobile,
          password: user.password, // Already hashed
          userType: user.userType || 'channelpartner', // Default to channelpartner
          introducer: user.introducer,
          introducerModel: introducerModel,
          introducerName: user.introducerName,
          introducerMobile: user.introducerMobile,
          createdAt: user.createdAt || new Date()
        };

        const channelPartner = new ChannelPartner(channelPartnerData);
        await channelPartner.save();

        console.log(`✅ Migrated: ${user.name} (${user.mobile}) → channelpartners collection`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrating user ${user.name} (${user.mobile}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📈 Total processed: ${users.length} users`);
    console.log('='.repeat(60));

    if (migratedCount > 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log('\n⚠️  IMPORTANT NOTES:');
      console.log('1. Old users collection is NOT deleted (kept for backup)');
      console.log('2. User IDs are preserved to maintain referral relationships');
      console.log('3. All users are set as "channelpartner" type by default');
      console.log('4. Users can update their type from their profile page');
      console.log('\n💡 Next steps:');
      console.log('- Test the application to verify everything works');
      console.log('- Check admin dashboard to see migrated data');
      console.log('- After confirming everything works, you can optionally backup/delete the old users collection');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run migration
console.log('🚀 Starting User to ChannelPartner Migration Script');
console.log('='.repeat(60));
migrateUsersToChannelPartners();
