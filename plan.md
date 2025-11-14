# Finding Sweetie PWA Implementation Plan

## Project Overview
This plan outlines the complete implementation of Finding Sweetie as a Progressive Web Application (PWA). Finding Sweetie is a secure, user-centric web application built on Node.js, Express, and SQLite3 that connects owners with lost and found pets.

## Why PWA for Finding Sweetie?

PWA features are especially valuable for this application since users are likely to be:
- On mobile devices
- In areas with poor connectivity (searching neighborhoods)
- Under stress (looking for their pet)
- Needing quick access without app store downloads

---

## Phase 1: Project Foundation & Initial Setup (Days 1-2)

### 1.1 Initialize Project Structure

```
claude_sweets/
├── package.json
├── server.js (Express app)
├── database/
│   ├── db.js (SQLite connection & setup)
│   └── schema.sql
├── routes/
│   ├── auth.js
│   ├── pets.js
│   └── users.js
├── middleware/
│   ├── auth.js
│   └── validators.js
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── lost-pet.html
│   ├── found-pet.html
│   ├── dashboard.html
│   ├── about.html
│   ├── css/ (if needed beyond Tailwind CDN)
│   ├── js/
│   │   ├── app.js (main frontend logic)
│   │   └── pwa-handler.js (PWA specific code)
│   ├── manifest.json ← PWA CRITICAL
│   ├── sw.js (service worker) ← PWA CRITICAL
│   └── icons/ ← PWA CRITICAL
│       ├── icon-72x72.png
│       ├── icon-96x96.png
│       ├── icon-128x128.png
│       ├── icon-144x144.png
│       ├── icon-152x152.png
│       ├── icon-192x192.png
│       ├── icon-384x384.png
│       └── icon-512x512.png
└── uploads/ (for pet images)
```

### 1.2 Install Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^9.2.2",
    "express-validator": "^7.0.1",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## Phase 2: Core Backend Development (Days 3-5)

### 2.1 Database Setup
- Create SQLite database with `users` and `pets` tables
- Add indexes for performance (zip_code, status, pet_type)
- Implement secure parameterized queries

### 2.2 Authentication System
- Bcrypt password hashing
- Express session management with HTTP-only cookies
- Session timeout middleware (300s idle timeout)
- Login/logout routes
- Registration with full validation

### 2.3 Pet Management APIs

Create endpoints for:
- POST `/api/pets/register` (add pet)
- GET `/api/pets/lost?zip=&type=` (search lost pets)
- GET `/api/pets/found?zip=&type=` (search found pets)
- GET `/api/pets/:id` (pet details)
- PUT `/api/pets/:id` (update pet)
- GET `/api/user/pets` (user's pets)
- POST `/api/user/update` (update user profile)

---

## Phase 3: Frontend Development with Tailwind (Days 6-9)

### 3.1 Global Template Component

Create a reusable template structure with:
- **Header**: Logo, navigation, conditional user display/logout
- **Footer**: Copyright info
- **Color Palette**: Calming blues/greens (e.g., `bg-gradient-to-br from-blue-50 to-green-50`)
- **Ad space placeholders** in header/sidebar

### 3.2 Build All Pages

- `index.html` - Hero section with CTA cards
- `login.html` - Secure login form
- `register.html` - Multi-step form (user info → pet info)
- `lost-pet.html` - Search + grid of lost pets
- `found-pet.html` - Search + grid of found pets
- `dashboard.html` - User's pets, notifications, edit capabilities
- `about.html` - Mission statement

### 3.3 Interactive Features

- Search/filter functionality
- Pet detail modals (click thumbnail)
- Google search integration for shelters/rescues by zip
- Secure SMS/Email contact buttons
- Image upload interface

---

## Phase 4: PWA Core Implementation (Days 10-12) ⭐ **CRITICAL PWA PHASE**

### 4.1 Web App Manifest (`public/manifest.json`)

```json
{
  "name": "Finding Sweetie - Lost & Found Pets",
  "short_name": "FindingSweetie",
  "description": "Connect with lost and found pets in your area",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f0f9ff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["social", "lifestyle"],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ]
}
```

### 4.2 Service Worker (`public/sw.js`)

**Caching Strategies**:
- **Static Assets** (HTML, CSS, JS, icons): Cache-first
- **API Responses** (pet listings): Network-first with fallback to cache
- **Pet Images**: Cache-first with background update
- **User Dashboard**: Network-only (always fresh data)

**Key Features**:

```javascript
// Cache names
const CACHE_NAME = 'finding-sweetie-v1';
const RUNTIME_CACHE = 'finding-sweetie-runtime-v1';

// Files to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/lost-pet.html',
  '/found-pet.html',
  '/css/app.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  'https://cdn.tailwindcss.com' // Tailwind CDN
];

// Install event - precache critical resources
// Fetch event - implement caching strategies
// Activate event - clean old caches
```

### 4.3 Register Service Worker

In all HTML files, add before `</body>`:

```javascript
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.log('SW registration failed:', err));
  });
}
</script>
```

### 4.4 Add Manifest Link

In all HTML `<head>` sections:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#3b82f6">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="FindingSweetie">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
```

---

## Phase 5: Advanced PWA Features (Days 13-15)

### 5.1 Offline Functionality

- **Offline Page**: Create `/offline.html` to show when no connection
- **Background Sync**: Queue pet submissions when offline, sync when online

```javascript
// In service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pet-submissions') {
    event.waitUntil(syncPetSubmissions());
  }
});
```

### 5.2 Install Prompt

Add custom "Add to Home Screen" prompt:

```javascript
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show custom install button
  showInstallPromotion();
});
```

### 5.3 Push Notifications (Optional but valuable!)

- Use Web Push API for pet match alerts
- Integrate with existing SMS/Email notification flags
- Prompt users to enable notifications for their search area

```javascript
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    // Subscribe to push notifications for zip code alerts
  }
});
```

### 5.4 Geolocation Integration

- Use browser geolocation to auto-detect user's area
- Pre-fill zip code in searches
- "Near me" quick filter for lost/found pets

---

## Phase 6: Icon & Asset Creation (Day 16)

### 6.1 App Icons

**Design Requirements**:
- Primary icon: Paw print (🐾) with "FS" or just stylized paw
- Maskable safe zone (80% of icon should be within safe area)
- Colors matching theme (blue/green calming palette)

**Tools**:
- Use free tools like [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
- Or create in Figma/Canva and export all sizes

**Required Sizes**:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### 6.2 Splash Screens (iOS)

Add Apple-specific splash screens for better iOS experience

---

## Phase 7: Testing & Optimization (Days 17-18)

### 7.1 Lighthouse PWA Audit

Run Lighthouse and ensure:
- ✅ **Installable** (manifest + service worker)
- ✅ **PWA Optimized** (fast load, works offline)
- ✅ **Accessible** (ARIA labels, semantic HTML)
- ✅ **Best Practices** (HTTPS, no console errors)
- ✅ **Performance** (>90 score)

### 7.2 Cross-Browser Testing

- Chrome/Edge (Chromium): Full PWA support
- Firefox: Partial support (no install prompt on desktop)
- Safari (iOS): Good support, test Add to Home Screen
- Safari (macOS): Limited PWA support

### 7.3 Offline Testing

- Test with DevTools offline mode
- Test background sync
- Ensure cached images load properly
- Test form submissions offline

### 7.4 Security Audit

- Verify bcrypt hashing
- Check all queries are parameterized
- Test session timeout
- Verify HTTP-only cookies
- Ensure HTTPS in production

---

## Phase 8: Deployment Preparation (Days 19-20)

### 8.1 HTTPS Setup

**For Local Testing (192.168.68.0/22)**:
- Generate self-signed certificate for local network testing
- Or use `mkcert` for trusted local HTTPS
- **Note**: PWAs require HTTPS (localhost is exempt)

```bash
# Using mkcert
mkcert -install
mkcert localhost 192.168.68.* "*.local"
```

Update server.js:

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('localhost-key.pem'),
  cert: fs.readFileSync('localhost.pem')
};

https.createServer(options, app).listen(443);
```

### 8.2 Production Deployment

- Use PM2 for process management
- Nginx reverse proxy with SSL (Let's Encrypt)
- Environment variables for secrets
- Database backup strategy

---

## Phase 9: PWA-Specific Enhancements (Ongoing)

### 9.1 Smart Caching Strategies

- **Update on Reload**: Notify users when new version available
- **Stale-While-Revalidate**: Show cached pets, update in background
- **Cache Expiration**: Refresh pet listings every hour

### 9.2 Offline Capabilities Matrix

| Feature | Offline Support | Strategy |
|---------|----------------|----------|
| View lost/found pets | ✅ Yes | Cache-first, show cached listings |
| View pet details | ✅ Yes | Cache-first for viewed pets |
| Submit found pet | ⏳ Queued | Background sync when online |
| Search/filter | ✅ Yes | Client-side filter of cached data |
| Login/logout | ❌ No | Requires server |
| Dashboard | ⏳ Partial | Show cached user data with "offline" indicator |

### 9.3 Performance Optimizations

- Lazy load pet images
- Compress images on upload (max 800x800px)
- Use WebP format with JPEG fallback
- Implement virtual scrolling for long pet lists
- Preload critical fonts

---

## Key PWA Benefits for Finding Sweetie

1. **Installable**: Users can add to home screen without app store
2. **Offline Search**: View previously loaded lost/found pets without connection
3. **Fast Load**: Instant loading from cache, critical when searching for a pet
4. **Mobile-First**: Works like a native app on phones
5. **Low Barrier**: No download required, just visit the site
6. **Background Sync**: Submit found pet reports even in poor connectivity areas
7. **Push Notifications**: Alert users when matching pets are found in their area
8. **Data Savings**: Cached images/pages reduce data usage

---

## PWA Quick Start Checklist

Once we build the app, verify these PWA essentials:

- [ ] `manifest.json` exists and is linked in all HTML
- [ ] Service worker registered and functioning
- [ ] Icons in all required sizes (especially 192x192, 512x512)
- [ ] HTTPS enabled (or localhost for testing)
- [ ] Offline page works
- [ ] Install prompt appears on mobile
- [ ] Lighthouse PWA audit score >90
- [ ] Theme color set and working
- [ ] Apple touch icons for iOS
- [ ] Background sync functional
- [ ] Cache versioning strategy in place

---

## Recommended Build Order

1. **Week 1**: Phase 1-2 (Setup + Backend)
2. **Week 2**: Phase 3 (Frontend)
3. **Week 3**: Phase 4-5 (PWA Core + Advanced features)
4. **Week 4**: Phase 6-8 (Polish, testing, deployment)

---

## Technical Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend Framework | Node.js + Express | Server and routing |
| Database | SQLite3 (better-sqlite3) | Data persistence |
| Password Security | Bcrypt | Password hashing |
| Session Management | express-session | User authentication |
| Validation | express-validator | Input validation |
| File Uploads | Multer | Pet image uploads |
| Frontend | HTML5 + Tailwind CSS | UI/UX |
| PWA | Service Worker + Manifest | Offline & install |
| Deployment OS | Ubuntu Linux | Production environment |

---

## Database Schema

### users Table

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    mobile_number TEXT,
    zip_code TEXT NOT NULL,
    flag_sms_notification BOOLEAN DEFAULT 0,
    flag_email_notification BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### pets Table

```sql
CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'Lost' or 'Found'
    pet_type TEXT NOT NULL,
    pet_name TEXT,
    pet_breed TEXT,
    pet_description TEXT,
    additional_comments TEXT,
    flag_chip BOOLEAN DEFAULT 0,
    image_url TEXT, -- Path for uploaded image
    last_seen_location TEXT, -- Derived from user's zip
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Getting Started

To begin implementation, follow Phase 1 to set up the project structure and install dependencies. Each phase builds upon the previous one, with Phase 4 being the critical PWA implementation phase that transforms Finding Sweetie from a standard web app into a Progressive Web Application.

The plan is designed to be flexible - you can adjust timelines based on your needs, but the phase order should generally be followed for optimal development flow.
