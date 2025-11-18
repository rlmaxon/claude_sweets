const express = require('express');
const pushService = require('../services/push/pushService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/push/vapid-public-key
 * Get VAPID public key for push subscription
 */
router.get('/vapid-public-key', (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
});

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 */
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.session.userId;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        error: 'Invalid subscription object'
      });
    }

    const result = await pushService.subscribe(userId, subscription);

    res.json({
      success: true,
      message: 'Subscribed to push notifications',
      ...result
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({
      error: 'Failed to subscribe to push notifications'
    });
  }
});

/**
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.session.userId;

    if (!endpoint) {
      return res.status(400).json({
        error: 'Endpoint required'
      });
    }

    await pushService.unsubscribe(userId, endpoint);

    res.json({
      success: true,
      message: 'Unsubscribed from push notifications'
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({
      error: 'Failed to unsubscribe'
    });
  }
});

/**
 * POST /api/push/test
 * Send test notification (dev/testing only)
 */
router.post('/test', requireAuth, async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Test notifications not allowed in production'
      });
    }

    const userId = req.session.userId;

    await pushService.sendNotificationToUser(
      userId,
      '🔔 Test Notification',
      'This is a test push notification from Finding Sweetie',
      { type: 'test', timestamp: Date.now() }
    );

    res.json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      message: error.message
    });
  }
});

/**
 * GET /api/push/status
 * Check user's push subscription status
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const subscriptions = require('../database/db').statements.getPushSubscriptionsByUser.all(userId);

    res.json({
      subscribed: subscriptions.length > 0,
      subscriptionCount: subscriptions.length,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        endpoint: sub.endpoint.substring(0, 50) + '...',
        createdAt: sub.created_at,
        lastUsed: sub.last_used
      }))
    });
  } catch (error) {
    console.error('Push status error:', error);
    res.status(500).json({
      error: 'Failed to check push status'
    });
  }
});

module.exports = router;
