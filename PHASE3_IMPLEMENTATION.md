# Phase 3: PWA Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start) ⭐ **Start here for PWA setup**
3. [File Structure](#file-structure)
4. [Core PWA Files](#core-pwa-files)
5. [Service Worker Deep Dive](#service-worker-deep-dive)
6. [Manifest Configuration](#manifest-configuration)
7. [Icon Generation](#icon-generation)
8. [Updating HTML Files](#updating-html-files)
9. [Testing PWA Features](#testing-pwa-features)
10. [Offline Functionality](#offline-functionality)
11. [Installation & App-Like Experience](#installation--app-like-experience)
12. [Troubleshooting](#troubleshooting)
13. [Best Practices](#best-practices)

---

## Overview

Phase 3 transforms Finding Sweetie from a standard web application into a Progressive Web App (PWA) with:
- **Offline functionality** - Works without internet connection
- **Installable** - Can be added to home screen like a native app
- **Fast loading** - Intelligent caching for instant page loads
- **App-like experience** - Standalone window, splash screen, etc.
- **Background sync** - Queue actions when offline, sync when online
- **Push notifications** - Alert users of pet matches (optional)

### What Makes Finding Sweetie a Perfect PWA?

Lost pet searches often happen:
- **In areas with poor connectivity** (searching neighborhoods, parks)
- **On mobile devices** (users on the move)
- **Under stress** (emotional urgency to find pets)
- **Repeatedly** (checking multiple times a day)

PWA features directly address these needs:
- View previously loaded pets offline
- Install app for quick access without browser
- Instant load times from cache
- Native app-like feel reduces friction

---

## Quick Start

**If you just want to know where PWA files go:**

```bash
# PWA files location
/home/user/claude_sweets/public/manifest.json          ← App metadata
/home/user/claude_sweets/public/sw.js                  ← Service worker
/home/user/claude_sweets/public/offline.html           ← Offline page
/home/user/claude_sweets/public/icons/                 ← App icons directory
/home/user/claude_sweets/generate_icons.sh             ← Icon generation script
```

**Quick setup (files already created in Phase 3):**

```bash
# Navigate to project root
cd /home/user/claude_sweets

# Verify PWA files exist
ls -la public/manifest.json
ls -la public/sw.js
ls -la public/offline.html
ls -la public/icons/

# All files should be present if Phase 3 is complete
```

**To test PWA locally:**

```bash
# Start server (HTTPS not required for localhost)
npm start

# Open browser
http://localhost:3000

# Check DevTools > Application > Manifest
# Check DevTools > Application > Service Workers
```

---

## File Structure

### PWA Files Added in Phase 3

```
claude_sweets/
├── public/
│   ├── manifest.json                    ← PWA app manifest (NEW)
│   ├── sw.js                            ← Service worker (NEW)
│   ├── offline.html                     ← Offline fallback page (NEW)
│   ├── icons/                           ← PWA icons directory (NEW)
│   │   ├── icon-72x72.svg              ← Icon placeholders
│   │   ├── icon-96x96.svg
│   │   ├── icon-128x128.svg
│   │   ├── icon-144x144.svg
│   │   ├── icon-152x152.svg
│   │   ├── icon-192x192.svg
│   │   ├── icon-384x384.svg
│   │   ├── icon-512x512.svg
│   │   └── icon.svg                     ← Master SVG icon
│   ├── screenshots/                     ← App screenshots (NEW)
│   │   ├── home.png                     ← (To be added)
│   │   └── dashboard.png                ← (To be added)
│   ├── index.html                       ← (TO BE UPDATED)
│   ├── login.html                       ← (TO BE UPDATED)
│   ├── register.html                    ← (TO BE UPDATED)
│   ├── lost-pet.html                    ← (TO BE UPDATED)
│   ├── found-pet.html                   ← (TO BE UPDATED)
│   ├── dashboard.html                   ← (TO BE UPDATED)
│   └── about.html                       ← (TO BE UPDATED)
├── generate_icons.sh                    ← Icon generation helper (NEW)
└── ...
```

### What Needs to Be Updated

All HTML files need:
1. **Manifest link** in `<head>`
2. **PWA meta tags** in `<head>`
3. **Service worker registration** before `</body>`
4. **Apple touch icons** for iOS

---

## Core PWA Files

### 1. manifest.json

**Location:** `/home/user/claude_sweets/public/manifest.json`

**Purpose:** Defines PWA metadata, icons, colors, and behavior

**Key Properties:**

```json
{
  "name": "Finding Sweetie - Lost & Found Pets",        // Full name
  "short_name": "FindingSweetie",                        // Home screen name
  "start_url": "/",                                      // Where app opens
  "display": "standalone",                               // Hide browser UI
  "background_color": "#f0f9ff",                         // Splash screen background
  "theme_color": "#3b82f6",                             // Browser theme color
  "icons": [ ... ],                                      // App icons
  "shortcuts": [ ... ]                                   // Quick actions
}
```

**Full file created at:** `public/manifest.json`

---

### 2. sw.js (Service Worker)

**Location:** `/home/user/claude_sweets/public/sw.js`

**Purpose:** Handles caching, offline functionality, and background sync

**Key Features:**

```javascript
// Cache names
const CACHE_NAME = 'finding-sweetie-v1';
const RUNTIME_CACHE = 'finding-sweetie-runtime-v1';
const IMAGE_CACHE = 'finding-sweetie-images-v1';

// Files to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/login.html',
  // ... all essential files
];
```

**Caching Strategies:**

| Resource Type | Strategy | Reason |
|--------------|----------|--------|
| HTML pages | Stale-while-revalidate | Show cached, update in background |
| API calls | Network-first | Always try fresh data, fallback to cache |
| Images | Cache-first | Serve cached, update in background |
| Static assets | Cache-first | Rarely change, serve from cache |
| CDN (Tailwind) | Cache-first | External, rarely changes |

**Full file created at:** `public/sw.js`

---

### 3. offline.html

**Location:** `/home/user/claude_sweets/public/offline.html`

**Purpose:** Fallback page shown when offline and no cache available

**Features:**
- Explains offline status
- Lists what users can still do
- Retry connection button
- Auto-detects when back online
- Links to cached pages

**Full file created at:** `public/offline.html`

---

## Service Worker Deep Dive

### Lifecycle

```
Install → Waiting → Activate → Fetch
   ↓         ↓          ↓         ↓
Cache    Skip Wait   Cleanup   Serve
```

**1. Install Event:**
```javascript
self.addEventListener('install', (event) => {
  // Cache essential files
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});
```

**2. Activate Event:**
```javascript
self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});
```

**3. Fetch Event:**
```javascript
self.addEventListener('fetch', (event) => {
  // Intercept network requests
  // Apply caching strategies
  event.respondWith(
    // Strategy based on request type
  );
});
```

### Caching Strategies Explained

**Network First:**
```javascript
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match(request) || caches.match('/offline.html');
  }
}
```
- Try network first
- Cache successful responses
- Fallback to cache if offline
- Show offline page if no cache

**Cache First:**
```javascript
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}
```
- Check cache first
- Return cached if available
- Fetch and cache if not
- Fast for static assets

**Stale While Revalidate:**
```javascript
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, response.clone());
      });
    }
    return response;
  });

  return cached || fetchPromise;
}
```
- Return cached immediately
- Update cache in background
- Best for pages that update occasionally

---

## Manifest Configuration

### Required Fields

```json
{
  "name": "Full App Name",              // Required
  "short_name": "Short Name",            // Required
  "start_url": "/",                      // Required
  "display": "standalone",               // Required
  "icons": [...]                         // Required (192px & 512px minimum)
}
```

### Display Modes

| Mode | Description | Browser UI |
|------|-------------|------------|
| `standalone` | Like native app | Hidden |
| `fullscreen` | Full screen | Hidden |
| `minimal-ui` | Minimal browser UI | Minimal |
| `browser` | Normal browser | Full |

**Finding Sweetie uses:** `standalone` (best for app-like experience)

### Theme Colors

```json
{
  "theme_color": "#3b82f6",           // Browser toolbar color
  "background_color": "#f0f9ff"       // Splash screen background
}
```

**Tips:**
- `theme_color` should match your app's primary color
- `background_color` should match your page background
- Keep colors consistent with CSS

### Shortcuts (Quick Actions)

```json
{
  "shortcuts": [
    {
      "name": "Lost Pets",
      "url": "/lost-pet.html",
      "icons": [{"src": "/icons/icon-192x192.png", "sizes": "192x192"}]
    }
  ]
}
```

Shortcuts appear when long-pressing app icon on Android.

---

## Icon Generation

### Required Icon Sizes

| Size | Purpose | Required? |
|------|---------|-----------|
| 72x72 | iOS, Android | Recommended |
| 96x96 | Android | Recommended |
| 128x128 | Chrome Web Store | Recommended |
| 144x144 | Windows | Recommended |
| 152x152 | iOS | Recommended |
| 192x192 | Android, Manifest | **REQUIRED** |
| 384x384 | Android | Recommended |
| 512x512 | Splash screen, Manifest | **REQUIRED** |

### Icon Design Guidelines

**Safe Zone:**
- Keep important content in center 80%
- Outer 10% on each side may be masked/cropped
- Don't put text near edges

**Maskable Icons:**
- Android can apply various masks (circle, squircle, etc.)
- Purpose: `"any maskable"` in manifest
- Design should work with any mask shape

**Color:**
- Use transparent background OR solid color
- Avoid gradients near edges
- Test on both light and dark backgrounds

### Using the Icon Generation Script

**Option 1: Auto-generate from online tool**

```bash
# 1. Visit PWA Builder Image Generator
https://www.pwabuilder.com/imageGenerator

# 2. Upload a 512x512 PNG image
# 3. Download the generated zip
# 4. Extract to public/icons/
unzip pwa-images.zip -d public/icons/
```

**Option 2: Use ImageMagick (local)**

```bash
# Install ImageMagick
sudo apt-get install imagemagick

# Create source icon (512x512)
# Save as: public/icons/source-icon.png

# Run generation script
./generate_icons.sh
```

**Option 3: Manual creation**

Design each size individually in Figma/Photoshop/GIMP:
- 72x72.png
- 96x96.png
- 128x128.png
- 144x144.png
- 152x152.png
- 192x192.png
- 384x384.png
- 512x512.png

Save to `public/icons/`

### Placeholder Icons (Current)

Phase 3 created SVG placeholders. For production:

```bash
# Convert SVG to PNG using online tool:
# 1. Visit: https://cloudconvert.com/svg-to-png
# 2. Upload public/icons/icon.svg
# 3. Set size to 512x512
# 4. Download as icon-512x512.png

# Or use ImageMagick:
convert -background none -resize 512x512 \
  public/icons/icon.svg public/icons/icon-512x512.png
```

---

## Updating HTML Files

All HTML files need PWA meta tags and service worker registration.

### Step 1: Add to `<head>` Section

Add this to **ALL** HTML files (`index.html`, `login.html`, `register.html`, `lost-pet.html`, `found-pet.html`, `dashboard.html`, `about.html`):

```html
<head>
    <!-- Existing meta tags -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title - Finding Sweetie</title>

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">

    <!-- Theme color for browser -->
    <meta name="theme-color" content="#3b82f6">

    <!-- iOS meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="FindingSweetie">

    <!-- iOS icons -->
    <link rel="apple-touch-icon" href="/icons/icon-152x152.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png">

    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-72x72.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png">

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- ... rest of head -->
</head>
```

### Step 2: Add Service Worker Registration

Add this **before** `</body>` in ALL HTML files:

```html
<!-- Service Worker Registration -->
<script>
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('SW registered:', registration.scope);

                    // Check for updates every hour
                    setInterval(() => {
                        registration.update();
                    }, 3600000);
                })
                .catch((error) => {
                    console.log('SW registration failed:', error);
                });
        });

        // Listen for service worker updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('New service worker activated');
            // Optional: Show "App updated" notification
        });
    }
</script>

<!-- Existing scripts -->
<script src="/js/app.js"></script>
<!-- ... -->
</body>
```

### Step 3: Add Install Prompt (Optional Enhancement)

Add to `public/js/app.js`:

```javascript
// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('Install prompt available');
    e.preventDefault();
    deferredPrompt = e;

    // Show custom install button
    showInstallButton();
});

function showInstallButton() {
    // Create install button in navbar
    const navAuth = document.getElementById('nav-auth');
    if (navAuth && !document.getElementById('install-btn')) {
        const installBtn = document.createElement('button');
        installBtn.id = 'install-btn';
        installBtn.className = 'bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm';
        installBtn.textContent = '📱 Install App';
        installBtn.onclick = installApp;
        navAuth.prepend(installBtn);
    }
}

async function installApp() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log('Install outcome:', outcome);

    if (outcome === 'accepted') {
        showNotification('App installed successfully!', 'success');
    }

    deferredPrompt = null;

    // Hide install button
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.remove();
}

// Track if app is running as installed PWA
window.addEventListener('appinstalled', () => {
    console.log('PWA installed');
    showNotification('Finding Sweetie installed!', 'success');
});

// Check if running as PWA
const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
              window.navigator.standalone === true;

if (isPWA) {
    console.log('Running as installed PWA');
}
```

---

## Testing PWA Features

### Local Testing (localhost)

```bash
# Start server
npm start

# Open browser
http://localhost:3000
```

**Chrome DevTools:**
1. Open DevTools (F12)
2. **Application tab**
3. Check sections:
   - **Manifest:** Should show all manifest data
   - **Service Workers:** Should show "activated and running"
   - **Cache Storage:** Should show cached files
   - **Offline:** Toggle to test offline mode

### Lighthouse PWA Audit

```bash
# In Chrome DevTools:
# 1. Open DevTools (F12)
# 2. Go to "Lighthouse" tab
# 3. Select "Progressive Web App"
# 4. Click "Generate report"
```

**Passing Criteria:**
- ✅ Registers a service worker
- ✅ Responds with 200 when offline
- ✅ Has a web app manifest
- ✅ Provides a valid 192px and 512px icon
- ✅ Splash screen configured
- ✅ Sets theme color
- ✅ Content properly sized for viewport
- ✅ Has a meta viewport tag
- ✅ Is served over HTTPS (production only)

**Target Score:** 90+ (100 is ideal)

### Testing Offline Functionality

**Method 1: DevTools**
```
1. Open DevTools (F12)
2. Go to "Network" tab
3. Check "Offline" checkbox
4. Reload page
5. Should still work with cached content
```

**Method 2: Real offline**
```
1. Visit site while online
2. Browse pages (builds cache)
3. Disconnect WiFi
4. Reload pages
5. Should still work
```

**What Should Work Offline:**
- View previously loaded lost/found pets
- Navigate between cached pages
- View pet details you've seen before
- Read offline message if page not cached

**What Won't Work Offline:**
- API calls (registration, login, new listings)
- Fresh data
- Image uploads
- Real-time updates

### Testing Installation

**Desktop (Chrome/Edge):**
1. Visit site
2. Look for install icon in address bar
3. Click install
4. App opens in standalone window

**Mobile (Android):**
1. Visit site in Chrome
2. Tap "Add to Home Screen" from menu
3. App icon appears on home screen
4. Tap icon - opens like native app

**Mobile (iOS Safari):**
1. Visit site
2. Tap Share button
3. Select "Add to Home Screen"
4. App icon appears on home screen

---

## Offline Functionality

### What Gets Cached

**On Install (PRECACHE_URLS):**
- All HTML pages
- JavaScript files
- manifest.json
- Icons
- Tailwind CSS CDN

**On First Visit (Runtime Cache):**
- Pet listings from API
- Pet images
- User data (if logged in)

### Cache Strategy by Resource

```javascript
// HTML pages: Stale-while-revalidate
'/index.html' → Show cached, update in background

// API calls: Network-first
'/api/pets/lost' → Try network, fallback to cache

// Images: Cache-first with refresh
'/uploads/pet.jpg' → Serve cached, update background

// CDN: Cache-first
'https://cdn.tailwindcss.com' → Serve from cache
```

### Cache Size Management

**Limits:**
- Chrome: ~80% of available disk space
- Firefox: ~50% of available disk space
- Safari: 50-200MB depending on available space

**Cleanup Strategy:**
```javascript
// In sw.js activate event
// Old caches are automatically deleted
// Only keeps current version caches
```

**Manual Cache Clear:**
```javascript
// In browser console
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
```

---

## Installation & App-Like Experience

### Standalone Mode

When installed, app runs in standalone mode:
- No browser address bar
- No browser navigation buttons
- Full screen app experience
- Separate icon on home screen/taskbar

### Splash Screen (Auto-generated)

Android auto-generates splash screen from:
- `icons[512x512]` - Large icon
- `background_color` - Background
- `name` - App name

Example:
```
[Blue background]
    [App Icon]
Finding Sweetie - Lost & Found Pets
```

### App Shortcuts

Long-press app icon shows shortcuts:
- Lost Pets → `/lost-pet.html`
- Found Pets → `/found-pet.html`
- My Dashboard → `/dashboard.html`

---

## Troubleshooting

### Issue 1: Service Worker Not Registering

**Symptom:**
```
Console: SW registration failed: SecurityError
```

**Cause:** Service worker requires HTTPS (except localhost)

**Solution:**
```bash
# For local testing: Use localhost (already works)
http://localhost:3000 ✓

# For production: Must use HTTPS
https://yourdomain.com ✓

# For local network testing with HTTPS:
# Use mkcert to generate trusted certificates
mkcert -install
mkcert localhost 192.168.68.71
```

---

### Issue 2: Manifest Not Loading

**Symptom:**
```
DevTools > Application > Manifest: "No manifest detected"
```

**Check:**
1. Manifest linked in HTML: `<link rel="manifest" href="/manifest.json">`
2. Manifest file exists: `ls public/manifest.json`
3. Valid JSON: `cat public/manifest.json | jq` (should parse)
4. Served with correct MIME type

**Fix:**
```bash
# Verify manifest is accessible
curl http://localhost:3000/manifest.json

# Should return JSON, not 404
```

---

### Issue 3: Icons Not Showing

**Symptom:**
- Install prompt shows no icon
- Home screen icon is generic/broken

**Check:**
```bash
# Verify icons exist
ls -la public/icons/

# Must have at minimum:
# - icon-192x192.png (or .svg)
# - icon-512x512.png (or .svg)
```

**Fix:**
```bash
# Convert SVG to PNG
# Option 1: Online tool
# Visit: https://cloudconvert.com/svg-to-png

# Option 2: ImageMagick
convert public/icons/icon.svg -resize 192x192 public/icons/icon-192x192.png
convert public/icons/icon.svg -resize 512x512 public/icons/icon-512x512.png

# Update manifest.json to use .png instead of .svg
```

---

### Issue 4: Old Service Worker Stuck

**Symptom:**
- Changes to sw.js not appearing
- Old cache persisting

**Solution:**
```bash
# In browser DevTools:
# 1. Application > Service Workers
# 2. Check "Update on reload"
# 3. Click "Unregister"
# 4. Reload page

# Or programmatically:
# In console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});
```

**Prevention:**
```javascript
// Update CACHE_NAME when making changes
const CACHE_NAME = 'finding-sweetie-v2'; // Increment version
```

---

### Issue 5: Not Passing Lighthouse PWA Audit

**Common failures:**

**"Does not register a service worker"**
- Add service worker registration to HTML
- Check sw.js is accessible

**"Does not respond with a 200 when offline"**
- Service worker not caching properly
- Check PRECACHE_URLS includes all pages

**"Manifest doesn't have a maskable icon"**
- Add `"purpose": "any maskable"` to icons
- Or remove `purpose` entirely

**"Not served over HTTPS"**
- OK for localhost
- Production must use HTTPS

**"No 512px icon"**
- Add icon-512x512.png to manifest

---

### Issue 6: Cache Not Updating

**Symptom:**
- User sees old content
- Changes not reflecting

**Cause:**
- Aggressive caching
- Service worker not updating

**Solution:**
```javascript
// Add versioning to cache names
const CACHE_NAME = 'finding-sweetie-v2'; // Update version

// Force update on page load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    registration.update();
  });
}
```

**User-facing solution:**
```javascript
// Show "Update Available" notification
navigator.serviceWorker.addEventListener('controllerchange', () => {
  showNotification('App updated! Reload to get latest version.', 'info');
});
```

---

### Issue 7: Can't Install on iOS

**iOS Limitations:**
- No install prompt
- Must manually "Add to Home Screen"
- Limited service worker support
- No push notifications

**Solution:**
```html
<!-- Ensure iOS meta tags present -->
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
```

**User Instructions:**
1. Open in Safari (not Chrome)
2. Tap Share button
3. Select "Add to Home Screen"
4. Tap "Add"

---

## Best Practices

### Cache Management

**DO:**
- ✅ Version cache names
- ✅ Delete old caches on activate
- ✅ Cache essential files on install
- ✅ Use different strategies for different resources
- ✅ Test offline functionality

**DON'T:**
- ❌ Cache everything
- ❌ Never update cache
- ❌ Ignore cache size
- ❌ Cache sensitive data
- ❌ Forget to clean old caches

### Service Worker Updates

```javascript
// Good: Versioned caches
const CACHE_NAME = 'app-v1.2.3';

// Bad: Static cache name
const CACHE_NAME = 'app-cache'; // Never changes!
```

### Offline UX

**DO:**
- ✅ Show offline indicator
- ✅ Queue actions for later sync
- ✅ Cache recently viewed content
- ✅ Provide offline fallback page
- ✅ Explain what works offline

**DON'T:**
- ❌ Fail silently
- ❌ Show broken images
- ❌ Lose user data
- ❌ Pretend everything works
- ❌ Hide offline status

### Performance

```javascript
// Good: Specific precaching
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/js/app.js'
];

// Bad: Cache everything
const PRECACHE_URLS = [
  '/',
  '/uploads/*',  // Don't precache all uploads!
  '/api/*'       // Don't precache all API responses!
];
```

### Testing

**Test Matrix:**

| Test | Desktop | Android | iOS |
|------|---------|---------|-----|
| Install | Chrome ✓ | Chrome ✓ | Safari ✓ |
| Offline | Chrome ✓ | Chrome ✓ | Safari ✓ |
| Lighthouse | Chrome ✓ | N/A | N/A |
| Push Notif | Chrome ✓ | Chrome ✓ | ❌ |
| Background Sync | Chrome ✓ | Chrome ✓ | ❌ |

---

## Success Checklist

Before deploying PWA to production:

### Files
- [ ] `manifest.json` exists in public/
- [ ] `sw.js` exists in public/
- [ ] `offline.html` exists in public/
- [ ] Icons directory exists with all sizes
- [ ] 192x192 icon present
- [ ] 512x512 icon present
- [ ] Screenshots added (optional but recommended)

### HTML Updates
- [ ] All pages link to manifest
- [ ] All pages register service worker
- [ ] PWA meta tags in all pages
- [ ] Apple touch icons in all pages
- [ ] Theme color meta tag present

### Service Worker
- [ ] Service worker registers successfully
- [ ] Essential files precached on install
- [ ] Offline page accessible when offline
- [ ] Old caches deleted on activate
- [ ] Fetch events handle different resource types

### Testing
- [ ] Lighthouse PWA audit score >90
- [ ] Works offline (load cached pages)
- [ ] Installable on desktop
- [ ] Installable on mobile (Android)
- [ ] Installable on iOS (manual)
- [ ] Splash screen appears (Android)
- [ ] Runs in standalone mode when installed
- [ ] App shortcuts work (Android)
- [ ] Theme color applies

### Performance
- [ ] First page load <3 seconds
- [ ] Cached pages load <1 second
- [ ] No console errors
- [ ] Service worker updates on deploy
- [ ] Cache size reasonable (<50MB)

### UX
- [ ] Offline indicator shows when offline
- [ ] Install prompt appears (desktop/Android)
- [ ] "Add to Home Screen" works (iOS)
- [ ] App behaves like native app when installed
- [ ] Smooth transitions between pages

---

## Next Steps: Phase 4 - Advanced PWA Features (Optional)

Phase 3 covers core PWA functionality. Optional enhancements:

1. **Push Notifications** - Alert users of pet matches
2. **Background Sync** - Queue pet submissions when offline
3. **Periodic Background Sync** - Update listings in background
4. **Web Share API** - Share pet listings
5. **File System Access** - Save pet photos locally
6. **Geolocation** - Auto-detect user location
7. **Camera Access** - Take pet photos directly

---

## Resources

**PWA Tools:**
- [PWA Builder](https://www.pwabuilder.com/) - Generate PWA assets
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - PWA auditing
- [Workbox](https://developers.google.com/web/tools/workbox) - Service worker library
- [Maskable.app](https://maskable.app/) - Test maskable icons

**Documentation:**
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Google: Service Workers](https://developers.google.com/web/fundamentals/primers/service-workers)

**Testing:**
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) - Automated testing
- [PWA Feature Detector](https://tomayac.github.io/pwa-feature-detector/) - Check support

---

**Phase 3 Complete!** Finding Sweetie is now a fully functional Progressive Web App! 🎉

