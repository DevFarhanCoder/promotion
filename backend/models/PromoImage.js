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
  type: {
    type: String,
    enum: ['english-day1', 'english-day2', 'english-both', 'hindi-day1', 'hindi-day2', 'hindi-both'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PromoImage', promoImageSchema);