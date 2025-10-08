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
      return res.status(404).json({ 
        message: 'Base promotional image file not found' 
      });
    }
    
    // Load the base image
    const baseImage = await Jimp.read(baseImagePath);
    const originalWidth = baseImage.getWidth();
    const originalHeight = baseImage.getHeight();
    
    // Load fonts - using larger sizes for better visibility
    const fontLargeBlack = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    const fontMediumBlack = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK); // Increased phone number font size
    const fontExtraLargeBlack = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK); // For name
    
    // Create extended image with extra space at bottom
    const bottomAreaHeight = 200; // Increased height for better spacing
    const extendedHeight = originalHeight + bottomAreaHeight;
    const extendedImage = new Jimp(originalWidth, extendedHeight, 0xFFFFFF);
    
    // Copy original image to the top
    extendedImage.composite(baseImage, 0, 0);
    
    // Create gradient-like background for user details (light gray with slight transparency)
    const credentialsRect = new Jimp(originalWidth, bottomAreaHeight, 0xF0F2F5FF);
    extendedImage.composite(credentialsRect, 0, originalHeight);
    
    // Add a subtle border line between image and user details
    const borderLine = new Jimp(originalWidth, 3, 0xDEE2E6FF);
    extendedImage.composite(borderLine, 0, originalHeight);
    
    let textStartX = 40;
    let profileImageX = 40;
    const bottomAreaStartY = originalHeight + 25; // More padding from top
    
    // Handle profile photo if exists
    if (user.profilePhoto) {
      try {
        const profilePath = path.join(__dirname, '../uploads', user.profilePhoto);
        if (fs.existsSync(profilePath)) {
          const profileImg = await Jimp.read(profilePath);
          // Resize profile image - keep it square (no circle)
          profileImg.resize(140, 140);
          
          // Position profile image on left side, vertically centered in bottom area
          const profileX = 40;
          const profileY = originalHeight + (bottomAreaHeight - 140) / 2;
          extendedImage.composite(profileImg, profileX, profileY);
          
          // Set text area to the right of profile image with more gap
          textStartX = profileX + 140 + 40; // 40px gap after profile image
          profileImageX = profileX;
        }
      } catch (error) {
        console.error('Error loading profile image:', error);
      }
    }

    // Add user details text with better centering and spacing
    const rightPadding = 40;
    
    if (user.profilePhoto && profileImageX !== undefined) {
      // With profile photo - center text in remaining area to the right
      const textWidth = originalWidth - textStartX - rightPadding;
      const textCenterY = originalHeight + (bottomAreaHeight / 2) - 60; // Adjust for larger text
      
      // Use extra large font for name
      extendedImage.print(fontExtraLargeBlack, textStartX, textCenterY, {
        text: user.displayName,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textWidth, 80);
      
      // Use large font for phone number (increased size)
      extendedImage.print(fontMediumBlack, textStartX, textCenterY + 100, {
        text: user.mobile,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textWidth, 60);
    } else {
      // Without profile photo - perfect center with more spacing
      const padding = 40;
      const textWidth = originalWidth - (padding * 2);
      const nameY = originalHeight + 40;
      const mobileY = originalHeight + 130; // Adjusted spacing for larger fonts
      
      // Use extra large font for name
      extendedImage.print(fontExtraLargeBlack, padding, nameY, {
        text: user.displayName,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textWidth, 80);
      
      // Use large font for phone number
      extendedImage.print(fontMediumBlack, padding, mobileY, {
        text: user.mobile,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textWidth, 40);
    }

    // Generate unique filename and save
    const filename = `personalized-${language}-${imageId}-${user._id}-${Date.now()}.png`;
    const filepath = path.join(__dirname, '../uploads', filename);
    
    await extendedImage.writeAsync(filepath);

    // Format the upload date as DD-MM-YYYY
    const uploadDate = new Date(promoImage.createdAt);
    const formattedDate = uploadDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');

    res.json({
      message: 'Personalized image generated successfully',
      imageUrl: `/uploads/${filename}`,
      filename: filename,
      language: language,
      imageId: imageId,
      uploadDate: formattedDate
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ message: 'Error generating personalized image' });
  }
});

module.exports = router;