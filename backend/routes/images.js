const express = require('express');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const PromoImage = require('../models/PromoImage');

const router = express.Router();

// @route   POST /api/images/generate
// @desc    Generate personalized promotional image
// @access  Private
router.post('/generate', auth, async (req, res) => {
  try {
    const user = req.user;
    const { imageId, language } = req.body;
    
    // Find the promotional image by ID
    const promoImage = await PromoImage.findById(imageId);
    
    if (!promoImage || !promoImage.isActive) {
      return res.status(404).json({ 
        message: 'Promotional image not found or not active' 
      });
    }
    
    // Load the base promotional image
    const baseImagePath = path.join(__dirname, '../uploads', promoImage.filename);
    
    if (!fs.existsSync(baseImagePath)) {
      console.error(`Missing image file: ${promoImage.filename} for image ID: ${imageId}`);
      
      // Mark image as inactive since file is missing
      promoImage.isActive = false;
      await promoImage.save();
      
      return res.status(404).json({ 
        message: 'Image file not found on server. Please contact admin to re-upload this promotional image.',
        imageId: imageId,
        filename: promoImage.filename
      });
    }
    
    // Load the base image
    const baseImage = await Jimp.read(baseImagePath);
    const originalWidth = baseImage.getWidth();
    const originalHeight = baseImage.getHeight();
    
    // Load fonts - bold fonts for better visibility
    const fontLargeBlack = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    const fontMediumBlack = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    
    // Create extended image with extra space at bottom
    const bottomAreaHeight = 180; // Increased height for better display
    const extendedHeight = originalHeight + bottomAreaHeight;
    const extendedImage = new Jimp(originalWidth, extendedHeight, 0xd17a22FF); // Golden/orange background
    
    // Copy original image to the top
    extendedImage.composite(baseImage, 0, 0);
    
    // Create background for user details with golden/orange color
    const credentialsRect = new Jimp(originalWidth, bottomAreaHeight, 0xd17a22FF);
    extendedImage.composite(credentialsRect, 0, originalHeight);
    
    let textStartX = 40;
    let profileImageX = 40;
    const bottomAreaStartY = originalHeight + 25; // More padding from top
    
    // No profile photo - use default text positioning
    textStartX = 40;
    profileImageX = undefined;

    // Add user details text with better centering and spacing
    const rightPadding = 30;
    
    if (user.profilePhoto && profileImageX !== undefined) {
      // With profile photo - center text in remaining area to the right
      const textWidth = originalWidth - textStartX - rightPadding;
      const textCenterY = originalHeight + 30; // Start from top with padding
      
      extendedImage.print(fontLargeBlack, textStartX, textCenterY, {
        text: user.displayName,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textWidth, 200); // Increased height to accommodate full name
      
      // Add more spacing between name and phone number
      extendedImage.print(fontMediumBlack, textStartX, textCenterY + 70, {
        text: user.mobile,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textWidth, 200); // Increased height for full number
    } else {
      // Without profile photo - perfect center with more spacing
      const padding = 30;
      const textWidth = originalWidth - (padding * 2);
      const nameY = originalHeight + 30;
      const mobileY = originalHeight + 100; // Spacing between name and mobile
      
      extendedImage.print(fontLargeBlack, padding, nameY, {
        text: user.displayName,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textWidth, 200); // Increased height to accommodate full name
      
      extendedImage.print(fontMediumBlack, padding, mobileY, {
        text: user.mobile,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textWidth, 200); // Increased height for full number
    }

    // Generate unique filename and save
    const filename = `personalized-${language}-${imageId}-${user._id}-${Date.now()}.png`;
    const filepath = path.join(__dirname, '../uploads', filename);
    
    await extendedImage.writeAsync(filepath);

    // Create a user-friendly filename for download
    const userFriendlyFilename = `${user.displayName}-${language}-promotional.png`;
    
    res.json({
      message: 'Personalized image generated successfully',
      imageUrl: `/uploads/${filename}`,
      filename: filename,
      userFriendlyFilename: userFriendlyFilename,
      language: language,
      imageId: imageId
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ message: 'Error generating personalized image' });
  }
});

module.exports = router;