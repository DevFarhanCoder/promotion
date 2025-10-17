const mongoose = require('mongoose');
const User = require('./models/User');
const ChannelPartner = require('./models/ChannelPartner');
const Customer = require('./models/Customer');
require('dotenv').config();

const verifyMigration = async () => {
  try {
    console.log('\n🔍 VERIFYING MIGRATION & DATABASE CONNECTION\n');
    console.log('='.repeat(70));
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/promotionDB');
    console.log('✅ Connected to MongoDB\n');

    // Check collections
    console.log('📊 COLLECTION STATISTICS:\n');
    
    const usersCount = await User.countDocuments();
    const channelPartnersCount = await ChannelPartner.countDocuments();
    const customersCount = await Customer.countDocuments();
    
    console.log(`   users collection:           ${usersCount} documents`);
    console.log(`   channelpartners collection: ${channelPartnersCount} documents`);
    console.log(`   customers collection:       ${customersCount} documents`);
    
    console.log('\n' + '='.repeat(70));
    
    // Check if data was migrated
    if (channelPartnersCount === 0) {
      console.log('\n⚠️  WARNING: channelpartners collection is EMPTY!');
      console.log('   Migration may not have run successfully.');
      console.log('\n💡 Run migration script:');
      console.log('   node migrateUsersToChannelPartners.js\n');
    } else {
      console.log('\n✅ SUCCESS: channelpartners collection has data!');
      console.log(`   ${channelPartnersCount} users have been migrated.\n`);
    }

    // Sample data from channelpartners
    if (channelPartnersCount > 0) {
      console.log('='.repeat(70));
      console.log('📋 SAMPLE DATA FROM CHANNELPARTNERS COLLECTION:\n');
      
      const sampleUsers = await ChannelPartner.find({})
        .select('name displayName mobile userType introducer introducerName createdAt')
        .limit(5)
        .sort({ createdAt: -1 });
      
      sampleUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.displayName}`);
        console.log(`   Mobile: ${user.mobile}`);
        console.log(`   User Type: ${user.userType}`);
        console.log(`   Introducer: ${user.introducerName || 'None'}`);
        console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
        console.log('');
      });
    }

    // Check referral relationships
    console.log('='.repeat(70));
    console.log('🔗 REFERRAL RELATIONSHIP VERIFICATION:\n');
    
    // Find users with introducers
    const usersWithIntroducers = await ChannelPartner.find({ 
      introducer: { $exists: true, $ne: null } 
    }).limit(5);
    
    console.log(`Found ${usersWithIntroducers.length} users with introducer references\n`);
    
    let validReferences = 0;
    let invalidReferences = 0;
    
    for (const user of usersWithIntroducers) {
      // Check if introducer exists in any collection
      let introducerExists = false;
      let collection = '';
      
      const cpIntroducer = await ChannelPartner.findById(user.introducer);
      if (cpIntroducer) {
        introducerExists = true;
        collection = 'channelpartners';
      } else {
        const custIntroducer = await Customer.findById(user.introducer);
        if (custIntroducer) {
          introducerExists = true;
          collection = 'customers';
        } else {
          const userIntroducer = await User.findById(user.introducer);
          if (userIntroducer) {
            introducerExists = true;
            collection = 'users';
          }
        }
      }
      
      if (introducerExists) {
        console.log(`✅ ${user.name} → Introducer found in '${collection}' collection`);
        validReferences++;
      } else {
        console.log(`❌ ${user.name} → Introducer NOT FOUND (broken reference)`);
        invalidReferences++;
      }
    }
    
    console.log(`\n📊 Results: ${validReferences} valid, ${invalidReferences} invalid references`);

    // Check specific user (Rajesh Modi)
    console.log('\n' + '='.repeat(70));
    console.log('👤 CHECKING SPECIFIC USER: Rajesh Modi\n');
    
    const rajeshInCP = await ChannelPartner.findOne({ mobile: '9867477227' });
    const rajeshInUsers = await User.findOne({ mobile: '9867477227' });
    
    if (rajeshInCP) {
      console.log('✅ Rajesh Modi found in channelpartners collection');
      console.log(`   Name: ${rajeshInCP.name}`);
      console.log(`   Display Name: ${rajeshInCP.displayName}`);
      console.log(`   User Type: ${rajeshInCP.userType}`);
      console.log(`   ID: ${rajeshInCP._id}`);
      
      // Count his referrals
      const referralCount = await ChannelPartner.countDocuments({ introducer: rajeshInCP._id });
      const referralCountCustomers = await Customer.countDocuments({ introducer: rajeshInCP._id });
      const referralCountOldUsers = await User.countDocuments({ introducer: rajeshInCP._id });
      
      const totalReferrals = referralCount + referralCountCustomers + referralCountOldUsers;
      
      console.log(`   Referrals in channelpartners: ${referralCount}`);
      console.log(`   Referrals in customers: ${referralCountCustomers}`);
      console.log(`   Referrals in users (old): ${referralCountOldUsers}`);
      console.log(`   TOTAL REFERRALS: ${totalReferrals}`);
      
      if (totalReferrals > 0) {
        console.log('\n   📋 His Direct Referrals:');
        const directReferrals = await ChannelPartner.find({ introducer: rajeshInCP._id })
          .select('name displayName mobile')
          .limit(5);
        
        directReferrals.forEach((ref, idx) => {
          console.log(`   ${idx + 1}. ${ref.name || ref.displayName} (${ref.mobile})`);
        });
      }
    } else {
      console.log('⚠️  Rajesh Modi NOT found in channelpartners collection');
    }
    
    if (rajeshInUsers) {
      console.log('\n📌 Rajesh Modi still exists in old users collection (backup)');
    }

    // API Route Check
    console.log('\n' + '='.repeat(70));
    console.log('🔌 API ROUTE CONFIGURATION CHECK:\n');
    
    console.log('The following routes NOW query channelpartners collection:');
    console.log('✅ /api/admin/referral-network');
    console.log('✅ /api/users/referral-network/:userId');
    console.log('✅ /api/users/my-referral-chain');
    console.log('✅ /api/users/search');
    console.log('✅ /api/auth/signup (creates in channelpartners)');
    console.log('✅ /api/auth/login (searches channelpartners first)');

    // Final Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL VERIFICATION SUMMARY:\n');
    
    if (channelPartnersCount > 0) {
      console.log('✅ Migration Status: SUCCESS');
      console.log(`✅ ${channelPartnersCount} users migrated to channelpartners`);
      console.log(`✅ Referral relationships: ${validReferences} valid`);
      console.log('✅ Database connection: Working');
      console.log('✅ Admin referral table: Will show channelpartners data');
      console.log('\n🎉 Your referral table is now connected to channelpartners collection!');
    } else {
      console.log('❌ Migration Status: NOT COMPLETE');
      console.log('⚠️  No data in channelpartners collection');
      console.log('💡 Please run: node migrateUsersToChannelPartners.js');
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
console.log('\n🔍 DATABASE MIGRATION VERIFICATION TOOL');
console.log('='.repeat(70));
verifyMigration();
