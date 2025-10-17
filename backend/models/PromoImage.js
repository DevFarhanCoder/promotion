const mongoose = require('mongoose');

const promoImageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  // Store image as Base64 string directly in MongoDB
  imageData: {
    type: String, // Base64 encoded image
    required: false // Optional for backward compatibility
  },
  mimeType: {
    type: String, // e.g., 'image/png', 'image/jpeg'
    required: false
  },
  cloudinaryUrl: {
    type: String,
    default: null // Kept for backward compatibility
  },
  title: {
    type: String,
    required: true,
    default: 'Promotional Event'
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  eventDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PromoImage', promoImageSchema);