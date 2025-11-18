const webpush = require('web-push');
const { statements } = require('../../database/db');

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@findingsweetie.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

class PushService {
  /**
   * Subscribe user to push notifications
   */
  async subscribe(userId, subscription) {
    try {
      const { endpoint, keys } = subscription;

      // Save subscription to database
      const result = statements.createPushSubscription.run(
        userId,
        endpoint,
        keys.p256dh,
        keys.auth,
        subscription.userAgent || null
      );

      console.log(`Push subscription created for user ${userId}`);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      // Handle duplicate endpoint (user already subscribed)
      if (error.code === 'SQLITE_CONSTRAINT') {
        console.log(`User ${userId} already subscribed to push`);
        return { success: true, message: 'Already subscribed' };
      }
      throw error;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribe(userId, endpoint) {
    statements.deletePushSubscription.run(endpoint, userId);
    console.log(`Push subscription removed for user ${userId}`);
    return { success: true };
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(userId, payload) {
    try {
      const subscriptions = statements.getPushSubscriptionsByUser.all(userId);

      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return { success: false, message: 'No subscriptions' };
      }

      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendNotification(sub, payload))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Sent push to user ${userId}: ${successful} sent, ${failed} failed`);

      return {
        success: true,
        sent: successful,
        failed: failed
      };
    } catch (error) {
      console.error('Error sending push to user:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific subscription
   */
  async sendNotification(subscription, payload) {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys_p256dh,
        auth: subscription.keys_auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

      // Update last_used timestamp
      statements.updatePushSubscriptionLastUsed.run(
        new Date().toISOString(),
        subscription.id
      );

      return { success: true };
    } catch (error) {
      // Handle subscription errors
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription expired or invalid - remove it
        console.log(`Removing expired subscription: ${subscription.endpoint}`);
        statements.deletePushSubscriptionById.run(subscription.id);
      }
      throw error;
    }
  }

  /**
   * Send pet match alert notification
   */
  async sendMatchAlert(userId, matchedPet) {
    const payload = {
      title: '🐾 Pet Match Found!',
      body: `A ${matchedPet.pet_type} matching your lost pet was reported nearby`,
      icon: matchedPet.image_url || '/icons/icon-192x192.svg',
      badge: '/icons/badge-72x72.png',
      tag: `match-${matchedPet.id}`,
      data: {
        type: 'match',
        petId: matchedPet.id,
        url: `/pet/${matchedPet.id}`
      },
      actions: [
        {
          action: 'view',
          title: 'View Pet',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };

    return await this.sendToUser(userId, payload);
  }

  /**
   * Send new message notification
   */
  async sendMessageNotification(userId, message) {
    const payload = {
      title: '💬 New Message',
      body: message.preview || 'You have a new message',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/badge-72x72.png',
      tag: `message-${message.conversationId}`,
      data: {
        type: 'message',
        conversationId: message.conversationId,
        url: `/chat/${message.conversationId}`
      },
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/reply-icon.png'
        },
        {
          action: 'view',
          title: 'View'
        }
      ]
    };

    return await this.sendToUser(userId, payload);
  }

  /**
   * Send general notification
   */
  async sendNotificationToUser(userId, title, body, data = {}) {
    const payload = {
      title,
      body,
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/badge-72x72.png',
      data
    };

    return await this.sendToUser(userId, payload);
  }

  /**
   * Broadcast to all subscribed users
   */
  async broadcast(payload) {
    try {
      const allSubscriptions = statements.getAllPushSubscriptions.all();

      console.log(`Broadcasting to ${allSubscriptions.length} subscriptions`);

      const results = await Promise.allSettled(
        allSubscriptions.map(sub => this.sendNotification(sub, payload))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        sent: successful,
        failed: failed,
        total: allSubscriptions.length
      };
    } catch (error) {
      console.error('Broadcast error:', error);
      throw error;
    }
  }

  /**
   * Clean up expired subscriptions
   */
  async cleanupExpiredSubscriptions(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = statements.deleteExpiredPushSubscriptions.run(
      cutoffDate.toISOString()
    );

    console.log(`Removed ${result.changes} expired push subscriptions`);
    return { removed: result.changes };
  }
}

module.exports = new PushService();
