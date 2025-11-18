// PWA Install Prompt Manager
class InstallPromptManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.installButton = null;

    this.init();
  }

  init() {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      this.trackInstallation();
      console.log('App is running as installed PWA');
      return;
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('Install prompt available');

      // Prevent default mini-infobar
      e.preventDefault();

      // Store the event for later use
      this.deferredPrompt = e;

      // Show custom install button
      this.showInstallButton();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.isInstalled = true;
      this.hideInstallButton();
      this.trackInstallation();
      this.showInstallSuccessMessage();
    });
  }

  /**
   * Show install button
   */
  showInstallButton() {
    // Create install button if it doesn't exist
    if (!this.installButton) {
      this.installButton = document.createElement('button');
      this.installButton.id = 'pwa-install-button';
      this.installButton.innerHTML = `
        <span class="install-icon">📱</span>
        <span class="install-text">Install App</span>
      `;
      this.installButton.className = 'pwa-install-btn';
      this.installButton.onclick = () => this.promptInstall();

      // Add CSS
      this.addInstallButtonStyles();
    }

    // Add to page
    document.body.appendChild(this.installButton);

    // Fade in animation
    setTimeout(() => {
      this.installButton.classList.add('visible');
    }, 100);
  }

  /**
   * Hide install button
   */
  hideInstallButton() {
    if (this.installButton) {
      this.installButton.classList.remove('visible');
      setTimeout(() => {
        if (this.installButton && this.installButton.parentNode) {
          this.installButton.parentNode.removeChild(this.installButton);
        }
      }, 300);
    }
  }

  /**
   * Prompt user to install
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('No install prompt available');
      return;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for the user's response
    const choiceResult = await this.deferredPrompt.userChoice;

    console.log(`User response to install prompt: ${choiceResult.outcome}`);

    // Track the choice
    this.trackInstallPromptResult(choiceResult.outcome);

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    this.deferredPrompt = null;
  }

  /**
   * Add CSS for install button
   */
  addInstallButtonStyles() {
    if (document.getElementById('pwa-install-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'pwa-install-styles';
    style.textContent = `
      .pwa-install-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 24px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 1000;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
      }

      .pwa-install-btn.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .pwa-install-btn:hover {
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        transform: translateY(-2px);
      }

      .pwa-install-btn:active {
        transform: translateY(0);
      }

      .install-icon {
        font-size: 20px;
      }

      @media (max-width: 640px) {
        .pwa-install-btn {
          bottom: 80px;
          right: 16px;
          padding: 10px 20px;
          font-size: 14px;
        }
      }

      /* Install success banner */
      .install-success-banner {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        z-index: 1001;
        opacity: 0;
        transition: all 0.4s ease;
      }

      .install-success-banner.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show install success message
   */
  showInstallSuccessMessage() {
    const banner = document.createElement('div');
    banner.className = 'install-success-banner';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">🎉</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">App Installed!</div>
          <div style="font-size: 14px; opacity: 0.9;">Finding Sweetie is now on your home screen</div>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    setTimeout(() => {
      banner.classList.add('show');
    }, 100);

    setTimeout(() => {
      banner.classList.remove('show');
      setTimeout(() => {
        if (banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
      }, 400);
    }, 5000);
  }

  /**
   * Track installation (send to analytics)
   */
  async trackInstallation() {
    try {
      await fetch('/api/analytics/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform: this.getPlatform(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to track installation:', error);
    }
  }

  /**
   * Track install prompt result
   */
  async trackInstallPromptResult(outcome) {
    try {
      await fetch('/api/analytics/install-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outcome,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to track install prompt:', error);
    }
  }

  /**
   * Get platform
   */
  getPlatform() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown';
  }

  /**
   * Check if app can be installed
   */
  canInstall() {
    return this.deferredPrompt !== null;
  }

  /**
   * Check if app is installed
   */
  getIsInstalled() {
    return this.isInstalled;
  }
}

// Initialize install prompt manager
window.installPromptManager = new InstallPromptManager();
