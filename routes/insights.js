const express = require('express');
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/insights
// @desc    Get AI-powered insights and recommendations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Get user's review statistics
    const stats = await Review.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalReviews = stats.reduce((sum, stat) => sum + stat.count, 0);
    
    if (totalReviews === 0) {
      return res.json({
        overallSentiment: 'neutral',
        positiveRate: 0,
        priorityAreas: [],
        recommendations: [],
        sentimentTrends: [],
        actionItems: []
      });
    }

    const positiveCount = stats.find(s => s._id === 'positive')?.count || 0;
    const negativeCount = stats.find(s => s._id === 'negative')?.count || 0;
    const neutralCount = stats.find(s => s._id === 'neutral')?.count || 0;

    const positiveRate = Math.round((positiveCount / totalReviews) * 100);
    const negativeRate = Math.round((negativeCount / totalReviews) * 100);
    const neutralRate = Math.round((neutralCount / totalReviews) * 100);

    // Calculate overall sentiment score
    let overallSentiment = 'neutral';
    let sentimentScore = 0;

    if (positiveRate > 60) {
      overallSentiment = 'positive';
      sentimentScore = positiveRate;
    } else if (negativeRate > 40) {
      overallSentiment = 'negative';
      sentimentScore = negativeRate;
    } else {
      sentimentScore = neutralRate;
    }

    // Generate insights based on sentiment distribution
    const insights = generateInsights(positiveRate, negativeRate, neutralRate, totalReviews);
    const recommendations = generateRecommendations(positiveRate, negativeRate, neutralRate);
    const actionItems = generateActionItems(negativeRate, totalReviews);

    res.json({
      overallSentiment: overallSentiment,
      positiveRate,
      negativeRate,
      neutralRate,
      totalReviews,
      priorityAreas: insights.priorityAreas,
      recommendations,
      sentimentTrends: [
        {
          category: 'Overall',
          sentiment: overallSentiment,
          percentage: sentimentScore
        },
        {
          category: 'Positive',
          sentiment: 'positive',
          percentage: positiveRate
        },
        {
          category: 'Negative',
          sentiment: 'negative',
          percentage: negativeRate
        },
        {
          category: 'Neutral',
          sentiment: 'neutral',
          percentage: neutralRate
        }
      ],
      actionItems
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate insights
function generateInsights(positiveRate, negativeRate, neutralRate, totalReviews) {
  const priorityAreas = [];

  if (negativeRate > 30) {
    priorityAreas.push('Customer Satisfaction');
  }
  if (neutralRate > 40) {
    priorityAreas.push('Engagement Improvement');
  }
  if (positiveRate < 50) {
    priorityAreas.push('Service Enhancement');
  }

  return { priorityAreas };
}

// Helper function to generate recommendations
function generateRecommendations(positiveRate, negativeRate, neutralRate) {
  const recommendations = [];

  if (negativeRate > 25) {
    recommendations.push({
      title: 'Address Customer Concerns',
      description: 'High negative sentiment indicates customer dissatisfaction. Focus on improving customer service and addressing common complaints.',
      impact: 'High'
    });
  }

  if (positiveRate < 60) {
    recommendations.push({
      title: 'Enhance Customer Experience',
      description: 'Below-average positive sentiment suggests room for improvement in customer experience and service quality.',
      impact: 'Medium'
    });
  }

  if (neutralRate > 30) {
    recommendations.push({
      title: 'Increase Customer Engagement',
      description: 'High neutral sentiment indicates customers are not strongly engaged. Consider implementing engagement strategies.',
      impact: 'Medium'
    });
  }

  if (positiveRate >= 70) {
    recommendations.push({
      title: 'Maintain Excellence',
      description: 'Excellent positive sentiment! Focus on maintaining current standards and identifying areas for further improvement.',
      impact: 'Low'
    });
  }

  return recommendations;
}

// Helper function to generate action items
function generateActionItems(negativeRate, totalReviews) {
  const actionItems = [];

  if (negativeRate > 30) {
    actionItems.push({
      description: 'Review and respond to negative feedback immediately',
      priority: 'High'
    });
    actionItems.push({
      description: 'Implement customer service training programs',
      priority: 'Medium'
    });
  }

  if (negativeRate > 20) {
    actionItems.push({
      description: 'Conduct customer satisfaction surveys',
      priority: 'Medium'
    });
  }

  if (totalReviews < 50) {
    actionItems.push({
      description: 'Increase review collection efforts',
      priority: 'Low'
    });
  }

  return actionItems;
}

module.exports = router; 