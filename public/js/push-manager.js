// Push Notification Manager
class PushManager {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.publicKey = null;
  }

  /**
   * Initialize push notifications
   */
  async init() {
    try {
      // Check if service worker and push are supported
      if (!('serviceWorker' in navigator)) {
        console.log('Service Workers not supported');
        return false;
      }

      if (!('PushManager' in window)) {
        console.log('Push API not supported');
        return false;
      }

      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const response = await fetch('/api/push/vapid-public-key');
      const data = await response.json();
      this.publicKey = data.publicKey;

      // Check current subscription status
      this.subscription = await this.registration.pushManager.getSubscription();

      return true;
    } catch (error) {
      console.error('Push init error:', error);
      return false;
    }
  }

  /**
   * Check if user is subscribed
   */
  async isSubscribed() {
    if (!this.registration) {
      await this.init();
    }

    this.subscription = await this.registration.pushManager.getSubscription();
    return this.subscription !== null;
  }

  /**
   * Request notification permission and subscribe
   */
  async subscribe() {
    try {
      if (!this.registration) {
        await this.init();
      }

      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Subscribe to push
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicKey)
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      this.subscription = subscription;

      console.log('Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('Subscribe error:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    try {
      if (!this.subscription) {
        return true;
      }

      // Unsubscribe from push manager
      await this.subscription.unsubscribe();

      // Remove from server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint
        })
      });

      this.subscription = null;

      console.log('Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      throw error;
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification() {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      return true;
    } catch (error) {
      console.error('Test notification error:', error);
      throw error;
    }
  }

  /**
   * Get subscription status
   */
  async getStatus() {
    try {
      const response = await fetch('/api/push/status');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get status error:', error);
      return null;
    }
  }

  /**
   * Helper: Convert base64 string to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Show notification permission prompt
   */
  async requestPermission() {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Check notification permission
   */
  getPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }
}

// Create global instance
window.pushManager = new PushManager();
