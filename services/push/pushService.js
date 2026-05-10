const webpush = require('web-push');
const { query } = require('../../database/db');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@findingsweetie.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

class PushService {
  async subscribe(userId, subscription) {
    try {
      const { endpoint, keys } = subscription;
      const result = await query(
        `INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth, user_agent)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [userId, endpoint, keys.p256dh, keys.auth, subscription.userAgent || null]
      );
      console.log(`Push subscription created for user ${userId}`);
      return { success: true, id: result.rows[0].id };
    } catch (error) {
      if (error.code === '23505') {
        console.log(`User ${userId} already subscribed to push`);
        return { success: true, message: 'Already subscribed' };
      }
      throw error;
    }
  }

  async unsubscribe(userId, endpoint) {
    await query(
      'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2',
      [endpoint, userId]
    );
    console.log(`Push subscription removed for user ${userId}`);
    return { success: true };
  }

  async sendToUser(userId, payload) {
    try {
      const result = await query(
        'SELECT * FROM push_subscriptions WHERE user_id = $1',
        [userId]
      );
      const subscriptions = result.rows;

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
      return { success: true, sent: successful, failed };
    } catch (error) {
      console.error('Error sending push to user:', error);
      throw error;
    }
  }

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
      await query(
        'UPDATE push_subscriptions SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
        [subscription.id]
      );
      return { success: true };
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`Removing expired subscription: ${subscription.endpoint}`);
        await query('DELETE FROM push_subscriptions WHERE id = $1', [subscription.id]);
      }
      throw error;
    }
  }

  async sendMatchAlert(userId, matchedPet) {
    const payload = {
      title: '🐾 Pet Match Found!',
      body: `A ${matchedPet.pet_type} matching your lost pet was reported nearby`,
      icon: matchedPet.image_url || '/icons/icon-192x192.svg',
      badge: '/icons/badge-72x72.png',
      tag: `match-${matchedPet.id}`,
      data: { type: 'match', petId: matchedPet.id, url: `/pet/${matchedPet.id}` },
      actions: [
        { action: 'view', title: 'View Pet', icon: '/icons/view-icon.png' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };
    return this.sendToUser(userId, payload);
  }

  async sendMessageNotification(userId, message) {
    const payload = {
      title: '💬 New Message',
      body: message.preview || 'You have a new message',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/badge-72x72.png',
      tag: `message-${message.conversationId}`,
      data: { type: 'message', conversationId: message.conversationId, url: `/chat/${message.conversationId}` },
      actions: [
        { action: 'reply', title: 'Reply', icon: '/icons/reply-icon.png' },
        { action: 'view', title: 'View' }
      ]
    };
    return this.sendToUser(userId, payload);
  }

  async sendNotificationToUser(userId, title, body, data = {}) {
    const payload = {
      title,
      body,
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/badge-72x72.png',
      data
    };
    return this.sendToUser(userId, payload);
  }

  async broadcast(payload) {
    try {
      const result = await query('SELECT * FROM push_subscriptions');
      const allSubscriptions = result.rows;

      console.log(`Broadcasting to ${allSubscriptions.length} subscriptions`);

      const results = await Promise.allSettled(
        allSubscriptions.map(sub => this.sendNotification(sub, payload))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { success: true, sent: successful, failed, total: allSubscriptions.length };
    } catch (error) {
      console.error('Broadcast error:', error);
      throw error;
    }
  }

  async cleanupExpiredSubscriptions(daysOld = 90) {
    const result = await query(
      `DELETE FROM push_subscriptions WHERE last_used < NOW() - INTERVAL '${daysOld} days'`
    );
    console.log(`Removed ${result.rowCount} expired push subscriptions`);
    return { removed: result.rowCount };
  }
}

module.exports = new PushService();
