# 🔄 Data Migration Guide

## Transfer Users Collection to ChannelPartners Collection

### Prerequisites
✅ Backend server must be running
✅ MongoDB must be accessible
✅ All code changes must be saved

---

## 🚀 Quick Migration (Recommended)

### Step 1: Stop Backend Server
In the backend terminal, press `Ctrl + C`

### Step 2: Run Migration Script
```powershell
cd "c:\Users\user3\Documents\New folder\promotion\backend"
node migrateUsersToChannelPartners.js
```

### Step 3: Restart Backend Server
```powershell
npm start
```

---

## 📋 What the Migration Does

1. ✅ Reads all users from `users` collection
2. ✅ Creates them in `channelpartners` collection with same `_id`
3. ✅ Preserves all referral relationships (introducer links)
4. ✅ Sets default userType as "channelpartner"
5. ✅ Skips users that already exist in channelpartners
6. ✅ Keeps original `users` collection as backup
7. ✅ Determines correct `introducerModel` based on where introducer exists

---

## 🔍 Expected Output

```
🚀 Starting User to ChannelPartner Migration Script
============================================================
Connecting to MongoDB...
✅ Connected to MongoDB

📊 Found 15 users in 'users' collection

🔄 Starting migration...

✅ Migrated: Rajesh Modi (9867477227) → channelpartners collection
✅ Migrated: Mohammad Farhan (9867969445) → channelpartners collection
✅ Migrated: John Doe (1234567890) → channelpartners collection
...

============================================================
📊 MIGRATION SUMMARY
============================================================
✅ Successfully migrated: 15 users
⏭️  Skipped (already exists): 0 users
❌ Errors: 0 users
📈 Total processed: 15 users
============================================================

✨ Migration completed successfully!
```

---

## 🧪 After Migration Testing

### 1. Test Login
- [ ] Login with existing user credentials
- [ ] Should find user in `channelpartners` collection
- [ ] Should work normally

### 2. Test Referral Network
- [ ] Go to "My Referrals"
- [ ] All referral relationships should be intact
- [ ] Should show complete network

### 3. Test Admin Dashboard
- [ ] Login as admin
- [ ] Go to User Management
- [ ] Should see all users from channelpartners
- [ ] Click on Rajesh Modi
- [ ] Should show his referral network

### 4. Test New Signups
- [ ] Create new user
- [ ] Select user type (Channel Partner/Customer/Both)
- [ ] Should create in correct collection
- [ ] Should be able to login

---

## ⚠️ Important Notes

### Data Preservation
- Original `users` collection is **NOT deleted**
- It remains as a backup
- You can manually delete it later after confirming everything works

### User IDs
- Same `_id` is used in channelpartners collection
- This maintains all referral relationships
- No need to update any references

### User Types
- All migrated users get `userType: 'channelpartner'` by default
- Users can update their type from Profile page
- They can change to 'customer' or 'both'

### Introducer Model
- Script automatically determines correct `introducerModel`
- Checks if introducer exists in ChannelPartner collection
- Falls back to 'User' if introducer is in old collection

---

## 🐛 Troubleshooting

### Error: "Cannot connect to MongoDB"
**Solution:** 
- Check if MongoDB is running
- Verify `MONGODB_URI` in `.env` file
- Make sure connection string is correct

### Error: "Duplicate key error"
**Solution:**
- Some users already exist in channelpartners
- Script will skip them automatically
- Check migration summary for details

### Error: "User model not found"
**Solution:**
- Make sure you're in the backend directory
- Run: `cd "c:\Users\user3\Documents\New folder\promotion\backend"`

### Migration Shows "0 users"
**Solution:**
- Check if users collection actually has data
- Verify MongoDB connection
- Check database name in connection string

---

## 🔄 Re-running Migration

If you need to run migration again:
1. Delete all documents from `channelpartners` collection (optional)
2. Run migration script again
3. Script will skip existing users automatically

---

## 📊 Manual Verification (MongoDB Compass)

After migration, verify in MongoDB Compass:

1. **channelpartners collection:**
   - Should have same number of documents as users
   - Each document should have `userType: 'channelpartner'`
   - All `_id` fields should match users collection

2. **users collection:**
   - Still has all original data (untouched)
   - Kept as backup

3. **Referral Relationships:**
   - Find a user with `introducer` field
   - Check if that `introducer` ID exists in channelpartners
   - Verify `introducerModel` is set correctly

---

## 🎯 Post-Migration Steps

1. ✅ Test application thoroughly
2. ✅ Verify admin dashboard shows migrated data
3. ✅ Test login with old user accounts
4. ✅ Create new test user and verify it works
5. ✅ Check referral networks are intact
6. ⏳ After 1-2 weeks of successful operation:
   - Consider backing up `users` collection
   - Optionally delete `users` collection (if confident)

---

## 🔙 Rollback Plan

If something goes wrong:
1. Stop the backend server
2. Delete `channelpartners` collection
3. Application will fall back to using `users` collection
4. Your auth middleware already checks both collections

---

## 💡 Tips

- Run migration during low-traffic time
- Keep backend server stopped during migration
- Monitor logs for any errors
- Test thoroughly before deleting old collection

---

Ready to migrate! 🚀

Run the command:
```powershell
node migrateUsersToChannelPartners.js
```
