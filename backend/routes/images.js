const express = require('express');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const PromoImage = require('../models/PromoImage');

const router = express.Router();

// @route   POST /api/images/generate
// @desc    Generate personalized promotional image using admin uploaded base image
// @access  Private
router.post('/generate', auth, async (req, res) => {
  try {
    const user = req.user;
    const { imageType } = req.body; // e.g., 'english-day1', 'hindi-day2', etc.
    
    // Find the base promotional image for the requested type
    const promoImage = await PromoImage.findOne({ 
      type: imageType, 
      isActive: true 
    });
    
    if (!promoImage) {
      return res.status(404).json({ 
        message: 'Base promotional image not found for this type' 
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
    const imageWidth = baseImage.getWidth();
    const imageHeight = baseImage.getHeight();
    
    // Load fonts - using available Jimp fonts (only these are available)
    const fontLargeBlack = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    const fontMediumBlack = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    
    // Calculate bottom area for user details (last 120 pixels for more space)
    const bottomAreaHeight = 120;
    const bottomAreaY = imageHeight - bottomAreaHeight;
    
    // Create semi-transparent white background for user credentials at bottom
    const credentialsRect = new Jimp(imageWidth, bottomAreaHeight, 0xFFFFFFCC);
    baseImage.composite(credentialsRect, 0, bottomAreaY);
    
    let textStartX = 20;
    let profileImageX = 20;
    
    // If user has profile photo, load and add it
    if (user.profilePhoto) {
      try {
        const profilePath = path.join(__dirname, '../uploads', user.profilePhoto);
        if (fs.existsSync(profilePath)) {
          const profileImg = await Jimp.read(profilePath);
          
          // Resize and make circular - larger profile image
          profileImg.resize(80, 80).circle();
          
          // Composite profile image - centered vertically in the bottom area
          baseImage.composite(profileImg, profileImageX, bottomAreaY + 20);
          textStartX = profileImageX + 100;
        }
      } catch (error) {
        console.error('Error loading profile image:', error);
      }
    }

    // Add user details text with larger fonts and better positioning
    if (user.profilePhoto && textStartX > 20) {
      // With profile photo - center text horizontally but place next to photo
      const textAreaWidth = imageWidth - textStartX - 20;
      baseImage.print(fontLargeBlack, textStartX, bottomAreaY + 20, {
        text: user.displayName,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textAreaWidth, 50);
      
      baseImage.print(fontMediumBlack, textStartX, bottomAreaY + 75, {
        text: user.mobile,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, textAreaWidth, 40);
    } else {
      // Without profile photo - center the text completely
      baseImage.print(fontLargeBlack, 0, bottomAreaY + 20, {
        text: user.displayName,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, imageWidth, 50);
      
      baseImage.print(fontMediumBlack, 0, bottomAreaY + 75, {
        text: user.mobile,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, imageWidth, 40);
    }

    // Generate unique filename
    const filename = `personalized-${imageType}-${user._id}-${Date.now()}.png`;
    const filepath = path.join(__dirname, '../uploads', filename);
    
    // Save image
    await baseImage.writeAsync(filepath);

    res.json({
      message: 'Personalized image generated successfully',
      imageUrl: `/uploads/${filename}`,
      filename: filename,
      type: imageType
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ message: 'Error generating personalized image' });
  }
});

// @route   GET /api/images/download/:filename
// @desc    Download generated image
// @access  Private
router.get('/download/:filename', auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    res.download(filepath, `promotional-image-${Date.now()}.png`);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading image' });
  }
});

module.exports = router;