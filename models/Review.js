const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Review text is required'],
    trim: true,
    maxlength: [10000, 'Review text cannot be more than 10000 characters']
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    required: [true, 'Sentiment classification is required']
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  language: {
    type: String,
    default: 'en'
  },
  source: {
    type: String,
    enum: ['upload', 'text-input'],
    required: true
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  processedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ sentiment: 1 });
reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema); 