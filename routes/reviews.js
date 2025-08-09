const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
  }
});

// ML Service URL
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// @route   POST /api/reviews/upload
// @desc    Upload CSV/Excel file for sentiment analysis
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const reviews = [];
    const fileBuffer = req.file.buffer;

    // Parse file based on type
    if (req.file.mimetype === 'text/csv') {
      // Parse CSV
      const csvText = fileBuffer.toString('utf-8');
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const reviewText = values[headers.findIndex(h => h.toLowerCase().includes('review') || h.toLowerCase().includes('text') || h.toLowerCase().includes('comment'))] || values[0];
        
        if (reviewText && reviewText.trim()) {
          reviews.push({ text: reviewText.trim() });
        }
      }
    } else {
      // Parse Excel
      const workbook = xlsx.read(fileBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      data.forEach(row => {
        const reviewText = row.review || row.text || row.comment || row.Review || row.Text || row.Comment || Object.values(row)[0];
        if (reviewText && typeof reviewText === 'string' && reviewText.trim()) {
          reviews.push({ text: reviewText.trim() });
        }
      });
    }

    if (reviews.length === 0) {
      return res.status(400).json({ message: 'No valid reviews found in the file' });
    }

    // Send reviews to ML service for analysis
    const analysisResults = [];
    for (const review of reviews) {
      try {
        // Try new endpoint first, fallback to old endpoint
        let mlResponse;
        try {
          mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
            text: review.text
          });
        } catch (error) {
          // Fallback to old endpoint
          mlResponse = await axios.post(`${ML_SERVICE_URL}/analyze`, {
            text: review.text
          });
        }
        
        const sentimentResult = {
          text: review.text,
          sentiment: mlResponse.data.sentiment,
          confidence: mlResponse.data.confidence || 0.8
        };
        
        analysisResults.push(sentimentResult);
        
        // Save to database
        const newReview = new Review({
          user: req.user._id,
          text: review.text,
          sentiment: sentimentResult.sentiment,
          confidence: sentimentResult.confidence,
          source: 'upload'
        });
        await newReview.save();
      } catch (error) {
        console.error('ML service error:', error);
        analysisResults.push({
          text: review.text,
          sentiment: 'neutral',
          confidence: 0.5
        });
      }
    }

    res.json({
      message: `Successfully analyzed ${analysisResults.length} reviews`,
      results: analysisResults
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error processing file' });
  }
});

// @route   POST /api/reviews/analyze-text
// @desc    Analyze single review text
// @access  Private
router.post('/analyze-text', auth, [
  body('text').trim().isLength({ min: 1, max: 10000 }).withMessage('Text must be between 1 and 10000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { text } = req.body;

    // Send to ML service for analysis
    try {
      // Try new endpoint first, fallback to old endpoint
      let mlResponse;
      try {
        mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
          text: text
        });
      } catch (error) {
        // Fallback to old endpoint
        mlResponse = await axios.post(`${ML_SERVICE_URL}/analyze`, {
          text: text
        });
      }
      
      const sentimentResult = {
        text: text,
        sentiment: mlResponse.data.sentiment,
        confidence: mlResponse.data.confidence || 0.8
      };
      
      // Save to database
      const newReview = new Review({
        user: req.user._id,
        text: text,
        sentiment: sentimentResult.sentiment,
        confidence: sentimentResult.confidence,
        source: 'text-input'
      });
      await newReview.save();

      res.json(sentimentResult);
    } catch (error) {
      console.error('ML service error:', error);
      res.status(500).json({ message: 'Error analyzing text' });
    }
  } catch (error) {
    console.error('Analyze text error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reviews/recent
// @desc    Get recent reviews for the user
// @access  Private
router.get('/recent', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const reviews = await Review.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.json(reviews);
  } catch (error) {
    console.error('Get recent reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reviews/stats
// @desc    Get review statistics for the user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Review.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      totalReviews: 0,
      positiveReviews: 0,
      negativeReviews: 0,
      neutralReviews: 0
    };

    stats.forEach(stat => {
      result.totalReviews += stat.count;
      if (stat._id === 'positive') result.positiveReviews = stat.count;
      if (stat._id === 'negative') result.negativeReviews = stat.count;
      if (stat._id === 'neutral') result.neutralReviews = stat.count;
    });

    res.json(result);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 