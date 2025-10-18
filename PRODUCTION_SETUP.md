# Production Setup Guide

## Issue: No Images Showing in Production

### Why This Happens:
- **Local Database** and **Production Database** are SEPARATE
- Images uploaded locally only exist in your local MongoDB
- Production (Vercel) connects to a different MongoDB database
- **You need to upload images again in production**

---

## Steps to Fix:

### 1. **Verify Backend is Running**

Check if your backend is accessible:
```
https://promotion-backend.onrender.com/api/admin/public-images
```

This should return JSON response (empty array if no images uploaded yet)

### 2. **Login to Admin Panel in Production**

1. Go to: `https://promotion-2025.vercel.app/admin-login`
2. Login with admin credentials:
   - Username: (your admin username)
   - Password: (your admin password)

### 3. **Upload Promotional Images**

1. After admin login, go to Admin Dashboard
2. Upload the same promotional images you used locally
3. Fill in:
   - Title (e.g., "Ameer Log", "Buy Flats & Shops")
   - Description
   - Event Date (e.g., Oct 15, 2025)
   - Select image file
4. Click Upload

### 4. **Verify Images Appear**

1. Logout from admin
2. Login as regular user (Rajesh Modi or any user)
3. Check Home page - images should now appear in the table

---

## Important Notes:

### ⚠️ **File Storage Issue on Vercel/Render**

**Problem**: Uploaded image files will be **deleted** on next deployment because:
- Vercel has **ephemeral filesystem** (files deleted on restart)
- Render free tier may also clear files periodically

**Symptoms**:
- Images show after upload
- After redeployment, images disappear
- Database records remain but files are missing

**Solution Options**:

#### Option 1: Re-upload After Each Deployment (Temporary)
- Every time you deploy, re-upload images via admin panel
- Quick but tedious

#### Option 2: Use Cloud Storage (Permanent - Recommended)
- Store images on **Cloudinary** (free tier: 25GB)
- Or use **AWS S3**, **Google Cloud Storage**
- Files persist permanently across deployments

---

## How to Implement Cloudinary (Permanent Solution)

### 1. Create Cloudinary Account
1. Go to: https://cloudinary.com/
2. Sign up for free account
3. Get your credentials:
   - Cloud Name
   - API Key
   - API Secret

### 2. Install Cloudinary
```bash
cd backend
npm install cloudinary multer-storage-cloudinary
```

### 3. Update Backend .env
Add to your Render environment variables:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Update Upload Route
The code will be modified to upload directly to Cloudinary instead of local `/uploads/` folder.

---

## Current Setup:

### Frontend (Vercel):
- URL: `https://promotion-2025.vercel.app`
- Environment: Production
- Database: MongoDB Atlas (production)

### Backend (Render):
- URL: `https://promotion-backend.onrender.com`
- Environment: Production
- Database: MongoDB Atlas (production)
- File Storage: Local `/uploads/` folder (ephemeral ⚠️)

### Local Development:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Database: Local MongoDB (different from production)
- File Storage: Local `/uploads/` folder (persistent ✅)

---

## Quick Checklist:

- [ ] Backend is running on Render
- [ ] MongoDB Atlas is connected
- [ ] Admin can login to production site
- [ ] Admin uploads promotional images
- [ ] Regular users can see images on Home page
- [ ] Images show in table with Download/Share buttons

---

## For Permanent Fix:

**Implement Cloudinary to ensure images persist across deployments!**

See instructions above or let me know if you want help setting it up.
