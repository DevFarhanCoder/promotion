// Migration script to convert existing images to Base64 in MongoDB
// This ensures images work in both local and production without file dependencies

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PromoImage = require('./models/PromoImage');

async function migrateImagesToBase64() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all promotional images
    const images = await PromoImage.find();
    console.log(`Found ${images.length} promotional images`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const image of images) {
      try {
        // Skip if already has Base64 data
        if (image.imageData) {
          console.log(`✓ Skipping ${image.filename} - already has Base64 data`);
          skipped++;
          continue;
        }

        // Check if file exists locally
        const filePath = path.join(__dirname, 'uploads', image.filename);
        
        if (!fs.existsSync(filePath)) {
          console.log(`✗ File not found: ${image.filename}`);
          console.log(`  → Please upload this image again through admin panel`);
          errors++;
          continue;
        }

        // Read file and convert to Base64
        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString('base64');
        
        // Determine mime type from file extension
        const ext = path.extname(image.filename).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        const mimeType = mimeTypes[ext] || 'image/jpeg';

        // Update database record with Base64 data
        image.imageData = base64Data;
        image.mimeType = mimeType;
        await image.save();

        console.log(`✓ Migrated: ${image.filename} (${image.title})`);
        migrated++;

      } catch (err) {
        console.error(`✗ Error migrating ${image.filename}:`, err.message);
        errors++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${images.length}`);

    if (migrated > 0) {
      console.log('\n✅ Images are now stored in MongoDB as Base64!');
      console.log('✅ They will work in both local and production!');
    }

    if (errors > 0) {
      console.log('\n⚠️  Some images could not be migrated.');
      console.log('   Please re-upload them through the admin panel.');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run migration
migrateImagesToBase64();
