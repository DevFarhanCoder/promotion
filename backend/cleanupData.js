const mongoose = require('mongoose');
const User = require('./models/User');
const ChannelPartner = require('./models/ChannelPartner');
const Customer = require('./models/Customer');

async function cleanupDuplicateUsers() {
  try {
    await mongoose.connect('mongodb+srv://admin:admin1234@cluster0.buqyset.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    
    console.log('Starting data cleanup...');
    
    // Get all users
    const allUsers = await User.find({});
    const allCPs = await ChannelPartner.find({});
    const allCustomers = await Customer.find({});
    
    console.log(`Found ${allUsers.length} Users, ${allCPs.length} ChannelPartners, ${allCustomers.length} Customers`);
    
    // Since Users and ChannelPartners have the same IDs, 
    // let's keep only ChannelPartners and delete duplicates from Users
    for (const cp of allCPs) {
      // Check if same user exists in User collection
      const duplicateUser = await User.findById(cp._id);
      if (duplicateUser) {
        console.log(`Removing duplicate user: ${duplicateUser.name} (${duplicateUser.mobile})`);
        await User.findByIdAndDelete(cp._id);
      }
    }
    
    // Update all Users to have default userType if not set
    await User.updateMany(
      { userType: { $exists: false } },
      { $set: { userType: 'Customer' } }
    );
    
    console.log('Data cleanup completed!');
    
    // Show final counts
    const finalUsers = await User.countDocuments();
    const finalCPs = await ChannelPartner.countDocuments();
    const finalCustomers = await Customer.countDocuments();
    
    console.log(`Final counts: Users: ${finalUsers}, ChannelPartners: ${finalCPs}, Customers: ${finalCustomers}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanupDuplicateUsers();
