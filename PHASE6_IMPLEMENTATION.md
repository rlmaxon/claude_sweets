# Phase 6: Real-time Communication & Advanced Discovery

## Overview

Phase 6 transforms Finding Sweetie into a comprehensive pet recovery platform with real-time communication, interactive maps, SMS alerts, social media integration, and partnerships with animal shelters. These features dramatically increase the chances of reuniting lost pets with their owners.

## New Features

### 1. SMS Notifications via Twilio
- **Instant text alerts** when matching pets are found
- Configurable SMS preferences per user
- Two-way SMS: Reply to engage with finder
- Bulk SMS for urgent alerts (Amber Alert style)
- International SMS support
- SMS verification for phone numbers
- Delivery status tracking
- Cost management and user SMS credits

### 2. Real-time Chat & Messaging
- **Direct messaging** between pet owners and finders
- Real-time chat with Socket.io
- Message notifications and unread counts
- Image sharing in conversations
- Conversation history and archiving
- Block/report inappropriate users
- Read receipts and typing indicators
- Message search and filtering
- Mobile-optimized chat interface

### 3. Interactive Map View
- **Visual pet location** on interactive map
- Cluster markers for multiple pets in area
- Distance radius visualization
- Filter pets by type, status, date on map
- "Draw search area" tool
- Geolocation: "Find pets near me"
- Heatmap of lost pet reports
- Custom map markers for Lost/Found/Shelter
- Street view integration
- Directions to last seen location

### 4. Social Media Integration
- **One-click sharing** to Facebook, Twitter, Instagram
- Auto-generate share images with pet details
- Track social media engagement
- Import pet images from social media
- Pre-filled share text with hashtags
- WhatsApp sharing for local groups
- Embed widgets for websites
- Success story sharing
- Viral campaign tools for urgent cases

### 5. Animal Shelter Integration
- **Shelter dashboard** for partnered organizations
- Bulk pet intake management
- Shelter API for automated imports
- Public shelter directory
- "Check local shelters" feature
- Adoption listings
- Transfer pets to shelters
- Shelter verification badges
- Stray hold tracking
- Adoption success tracking

### 6. Advanced Search & Discovery
- Reverse image search (find similar pets)
- Saved searches with auto-alerts
- Search history
- Recommended searches based on activity
- AI-powered duplicate detection
- Cross-reference with shelter databases
- Breed identification from photos
- "Pets similar to this one" suggestions

## Database Changes

### New Table: `messages`
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  message_text TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT 0,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_unread ON messages(recipient_id, is_read);
```

### New Table: `conversations`
```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user1_id INTEGER NOT NULL,
  user2_id INTEGER NOT NULL,
  pet_id INTEGER,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL,
  UNIQUE(user1_id, user2_id, pet_id)
);

CREATE INDEX idx_conversations_users ON conversations(user1_id, user2_id);
```

### New Table: `sms_logs`
```sql
CREATE TABLE sms_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'delivered', 'failed')),
  twilio_sid TEXT,
  error_message TEXT,
  cost REAL DEFAULT 0.0,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sms_status ON sms_logs(status, created_at);
CREATE INDEX idx_sms_user ON sms_logs(user_id, created_at);
```

### New Table: `shelters`
```sql
CREATE TABLE shelters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  organization_type TEXT CHECK(organization_type IN ('shelter', 'rescue', 'humane_society', 'animal_control')),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  latitude REAL,
  longitude REAL,
  is_verified BOOLEAN DEFAULT 0,
  api_key TEXT UNIQUE,
  intake_capacity INTEGER DEFAULT 0,
  current_occupancy INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shelters_location ON shelters(zip_code, city, state);
CREATE INDEX idx_shelters_verified ON shelters(is_verified);
```

### New Table: `social_shares`
```sql
CREATE TABLE social_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('facebook', 'twitter', 'instagram', 'whatsapp', 'email')),
  share_url TEXT,
  engagement_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_social_shares_pet ON social_shares(pet_id, platform);
```

### New Table: `saved_searches`
```sql
CREATE TABLE saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  search_name TEXT NOT NULL,
  search_params TEXT NOT NULL, -- JSON string
  notify_on_match BOOLEAN DEFAULT 1,
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
```

### Updated `users` Table
```sql
ALTER TABLE users ADD COLUMN sms_verified BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN sms_credits INTEGER DEFAULT 10;
ALTER TABLE users ADD COLUMN latitude REAL;
ALTER TABLE users ADD COLUMN longitude REAL;
ALTER TABLE users ADD COLUMN notify_sms BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN blocked_users TEXT; -- JSON array of blocked user IDs
```

### Updated `pets` Table
```sql
ALTER TABLE pets ADD COLUMN latitude REAL;
ALTER TABLE pets ADD COLUMN longitude REAL;
ALTER TABLE pets ADD COLUMN social_shares INTEGER DEFAULT 0;
ALTER TABLE pets ADD COLUMN message_count INTEGER DEFAULT 0;
ALTER TABLE pets ADD COLUMN shelter_id INTEGER REFERENCES shelters(id);
ALTER TABLE pets ADD COLUMN intake_date TIMESTAMP;
```

## New Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "twilio": "^4.20.0",
    "socket.io": "^4.6.1",
    "socket.io-client": "^4.6.1",
    "leaflet": "^1.9.4",
    "canvas": "^2.11.2",
    "jimp": "^0.22.12",
    "node-geocoder": "^4.3.0",
    "geolib": "^3.3.4",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "profanity-filter": "^1.0.3"
  }
}
```

### Package Descriptions:
- **twilio**: SMS/MMS messaging service
- **socket.io**: Real-time bidirectional communication
- **socket.io-client**: Client-side Socket.io library
- **leaflet**: Interactive maps library (open source)
- **canvas**: Server-side canvas for social share images
- **jimp**: Image processing for share cards
- **node-geocoder**: Convert addresses to coordinates
- **geolib**: Geographic calculations (distance, etc.)
- **helmet**: Security headers for Express
- **express-rate-limit**: API rate limiting
- **profanity-filter**: Content moderation

## Installation Instructions

### Step 1: Pull Latest Code

```bash
cd /var/www/claude_sweets
git checkout main
git pull origin main
```

### Step 2: Install Dependencies

```bash
npm install twilio socket.io socket.io-client leaflet canvas jimp node-geocoder geolib helmet express-rate-limit profanity-filter
```

Verify installation:
```bash
npm list twilio socket.io leaflet
```

### Step 3: Configure Twilio SMS Service

**Sign up for Twilio:**
1. Go to https://www.twilio.com/try-twilio
2. Sign up for free account (free trial includes $15 credit)
3. Get a phone number
4. Copy Account SID and Auth Token

**Update `.env` file:**

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
ENABLE_SMS_NOTIFICATIONS=true
SMS_RATE_LIMIT=10
SMS_COST_PER_MESSAGE=0.0075
FREE_SMS_CREDITS=10

# Socket.io Configuration
SOCKET_IO_PORT=3001
SOCKET_IO_PATH=/socket.io
ENABLE_WEBSOCKETS=true

# Map Configuration
MAP_DEFAULT_CENTER_LAT=39.8283
MAP_DEFAULT_CENTER_LNG=-98.5795
MAP_DEFAULT_ZOOM=4
MAPBOX_ACCESS_TOKEN=optional_for_premium_tiles

# Geocoding
GEOCODING_PROVIDER=openstreetmap
GEOCODING_API_KEY=optional

# Social Media
FACEBOOK_APP_ID=your_app_id
TWITTER_API_KEY=your_api_key

# Security
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 4: Database Migration

The migration runs automatically on server startup.

**Manual migration** (optional):

```bash
# Backup database
cp database/findingsweetie.db database/findingsweetie.db.backup-phase6

# Run migration
npm run migrate:phase6

# Verify tables created
sqlite3 database/findingsweetie.db ".tables"
# Should see: messages, conversations, sms_logs, shelters, social_shares, saved_searches
```

### Step 5: Set Up Map Tiles

Maps use OpenStreetMap (free, no API key required).

**Optional - Mapbox for Premium Tiles:**
1. Sign up at https://www.mapbox.com/
2. Get free access token (50,000 requests/month free)
3. Add to `.env`: `MAPBOX_ACCESS_TOKEN=your_token`

### Step 6: Create Required Directories

```bash
mkdir -p public/share-cards
mkdir -p public/map-markers
mkdir -p uploads/chat
chmod 755 public/share-cards
chmod 755 public/map-markers
chmod 755 uploads/chat
```

### Step 7: Start Socket.io Server

**Option A: Single Server (Development)**
```bash
npm run start:dev
# Starts both Express and Socket.io on same process
```

**Option B: Separate Servers (Production)**
```bash
# Terminal 1: Main app
npm start

# Terminal 2: Socket.io server
npm run start:sockets

# Or use PM2 for process management
pm2 start ecosystem.config.js
```

### Step 8: Verify Installation

```bash
# Check main server
curl http://localhost:3000/api/health

# Check Socket.io server
curl http://localhost:3001/socket.io/
# Should return Socket.io handshake

# Test Twilio configuration
npm run test-sms +1234567890
```

## Feature Implementation Details

### 1. SMS Notification System

**File: `services/sms/twilioService.js`**

```javascript
const twilio = require('twilio');
const { statements } = require('../../database/db');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class SMSService {
  async sendSMS(userId, phoneNumber, message) {
    try {
      // Check user has SMS credits
      const user = statements.getUserById.get(userId);
      if (user.sms_credits <= 0) {
        throw new Error('No SMS credits remaining');
      }

      // Send via Twilio
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      // Log the SMS
      statements.createSMSLog.run(
        userId,
        phoneNumber,
        message,
        'sent',
        result.sid,
        null,
        parseFloat(process.env.SMS_COST_PER_MESSAGE),
        new Date().toISOString()
      );

      // Deduct credit
      statements.deductSMSCredit.run(userId);

      return { success: true, sid: result.sid };
    } catch (error) {
      // Log failed SMS
      statements.createSMSLog.run(
        userId,
        phoneNumber,
        message,
        'failed',
        null,
        error.message,
        0,
        null
      );

      throw error;
    }
  }

  async sendMatchAlert(user, matchedPet) {
    const message = `🐾 MATCH FOUND! A ${matchedPet.pet_type} matching your lost pet was reported in ${matchedPet.zip_code}. View: ${process.env.APP_URL}/pet/${matchedPet.id}`;

    return await this.sendSMS(user.id, user.mobile_number, message);
  }

  async verifyPhoneNumber(userId, phoneNumber) {
    const code = Math.floor(100000 + Math.random() * 900000);
    const message = `Your Finding Sweetie verification code is: ${code}`;

    await this.sendSMS(userId, phoneNumber, message);

    // Store verification code (implement verification table)
    return { code, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 minutes
  }
}

module.exports = new SMSService();
```

**Usage:**
```javascript
const smsService = require('./services/sms/twilioService');

// Send match alert
await smsService.sendMatchAlert(user, matchedPet);

// Send custom SMS
await smsService.sendSMS(userId, '+1234567890', 'Your pet was spotted!');
```

### 2. Real-time Chat System

**File: `services/chat/socketServer.js`**

```javascript
const socketIO = require('socket.io');
const { statements } = require('../../database/db');

class ChatServer {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.APP_URL,
        methods: ['GET', 'POST']
      },
      path: '/socket.io'
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Authenticate user
      socket.on('authenticate', (userId) => {
        socket.userId = userId;
        socket.join(`user-${userId}`);
      });

      // Join conversation room
      socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation-${conversationId}`);
      });

      // Send message
      socket.on('send_message', async (data) => {
        const { conversationId, recipientId, message, imageUrl } = data;

        // Save to database
        const result = statements.createMessage.run(
          conversationId,
          socket.userId,
          recipientId,
          message,
          imageUrl || null,
          new Date().toISOString()
        );

        const messageData = {
          id: result.lastInsertRowid,
          conversationId,
          senderId: socket.userId,
          recipientId,
          message,
          imageUrl,
          createdAt: new Date().toISOString()
        };

        // Emit to conversation room
        this.io.to(`conversation-${conversationId}`).emit('new_message', messageData);

        // Emit notification to recipient
        this.io.to(`user-${recipientId}`).emit('message_notification', {
          conversationId,
          senderId: socket.userId,
          preview: message.substring(0, 50)
        });
      });

      // Typing indicator
      socket.on('typing', ({ conversationId, recipientId }) => {
        socket.to(`user-${recipientId}`).emit('user_typing', {
          conversationId,
          userId: socket.userId
        });
      });

      // Mark as read
      socket.on('mark_read', async ({ conversationId, messageIds }) => {
        for (const msgId of messageIds) {
          statements.markMessageRead.run(msgId, new Date().toISOString());
        }

        socket.to(`conversation-${conversationId}`).emit('messages_read', {
          messageIds,
          readBy: socket.userId
        });
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }
}

module.exports = ChatServer;
```

**Frontend Integration:**

```html
<!-- public/chat.html -->
<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io('http://localhost:3001');

// Authenticate
socket.emit('authenticate', currentUserId);

// Join conversation
socket.emit('join_conversation', conversationId);

// Send message
function sendMessage() {
  const message = document.getElementById('message-input').value;
  socket.emit('send_message', {
    conversationId: conversationId,
    recipientId: recipientId,
    message: message
  });
}

// Receive messages
socket.on('new_message', (data) => {
  appendMessage(data);
});

// Typing indicator
document.getElementById('message-input').addEventListener('input', () => {
  socket.emit('typing', { conversationId, recipientId });
});
</script>
```

### 3. Interactive Map View

**File: `public/map.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    #map { height: 600px; width: 100%; }
    .custom-marker-lost {
      background-color: #ef4444;
      border: 2px solid white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
    }
    .custom-marker-found {
      background-color: #10b981;
      border: 2px solid white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    // Initialize map
    const map = L.map('map').setView([39.8283, -98.5795], 4);

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Fetch pets with coordinates
    async function loadPetsOnMap() {
      const response = await fetch('/api/pets/map-data');
      const data = await response.json();

      data.pets.forEach(pet => {
        if (pet.latitude && pet.longitude) {
          // Create custom marker
          const markerIcon = L.divIcon({
            className: `custom-marker-${pet.status.toLowerCase()}`,
            html: pet.status === 'Lost' ? '🔴' : '🟢',
            iconSize: [30, 30]
          });

          const marker = L.marker([pet.latitude, pet.longitude], {
            icon: markerIcon
          }).addTo(map);

          // Add popup
          marker.bindPopup(`
            <div style="min-width: 200px;">
              <img src="${pet.image_url}" style="width: 100%; max-height: 150px; object-fit: cover;">
              <h3>${pet.pet_name || 'Unknown'}</h3>
              <p><strong>${pet.status}</strong> ${pet.pet_type}</p>
              <p>${pet.pet_description}</p>
              <a href="/pet/${pet.id}" class="btn">View Details</a>
            </div>
          `);
        }
      });
    }

    // "Find Near Me" button
    function findNearMe() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          map.setView([lat, lng], 13);

          // Add "You are here" marker
          L.marker([lat, lng], {
            icon: L.icon({
              iconUrl: '/images/location-pin.png',
              iconSize: [40, 40]
            })
          }).addTo(map).bindPopup('You are here');

          // Load nearby pets
          loadNearbyPets(lat, lng);
        });
      }
    }

    // Load map
    loadPetsOnMap();
  </script>
</body>
</html>
```

**Backend Endpoint:**

```javascript
// routes/pets.js - Add map data endpoint
router.get('/map-data', async (req, res) => {
  try {
    const { bounds, status, type } = req.query;

    let query = `
      SELECT id, pet_name, pet_type, pet_description, status,
             image_url, latitude, longitude, zip_code
      FROM pets
      WHERE is_active = 1
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
    `;

    if (status) query += ` AND status = '${status}'`;
    if (type) query += ` AND pet_type = '${type}'`;

    // Filter by map bounds if provided
    if (bounds) {
      const [swLat, swLng, neLat, neLng] = bounds.split(',');
      query += ` AND latitude BETWEEN ${swLat} AND ${neLat}`;
      query += ` AND longitude BETWEEN ${swLng} AND ${neLng}`;
    }

    const pets = db.prepare(query).all();

    res.json({ success: true, pets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load map data' });
  }
});
```

### 4. Social Media Sharing

**File: `services/social/shareCardGenerator.js`**

```javascript
const Jimp = require('jimp');
const path = require('path');

class ShareCardGenerator {
  async generateShareCard(pet) {
    try {
      // Create 1200x630 image (optimal for social media)
      const card = new Jimp(1200, 630, '#3b82f6');

      // Load pet image
      if (pet.image_url) {
        const petImage = await Jimp.read(path.join(__dirname, '../../public', pet.image_url));
        petImage.resize(500, 500);
        card.composite(petImage, 50, 65);
      }

      // Load font
      const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
      const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

      // Add text
      card.print(font, 600, 100, {
        text: `${pet.status.toUpperCase()} PET`,
        alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
      });

      card.print(fontSmall, 600, 200, {
        text: pet.pet_name || 'Unknown',
        alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
      });

      card.print(fontSmall, 600, 260, {
        text: `${pet.pet_type} • ${pet.pet_breed || 'Mixed'}`,
        alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
      });

      card.print(fontSmall, 600, 320, {
        text: pet.last_seen_location || 'Location unknown',
        alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
      });

      // Add logo/branding
      card.print(fontSmall, 600, 550, {
        text: 'FindingSweetie.app',
        alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
      });

      // Save
      const filename = `share-${pet.id}-${Date.now()}.jpg`;
      const filepath = path.join(__dirname, '../../public/share-cards', filename);
      await card.writeAsync(filepath);

      return `/share-cards/${filename}`;
    } catch (error) {
      console.error('Error generating share card:', error);
      return null;
    }
  }
}

module.exports = new ShareCardGenerator();
```

**Frontend Share Buttons:**

```html
<div class="share-buttons">
  <button onclick="shareToFacebook()">
    📘 Share on Facebook
  </button>
  <button onclick="shareToTwitter()">
    🐦 Share on Twitter
  </button>
  <button onclick="shareToWhatsApp()">
    💬 Share on WhatsApp
  </button>
</div>

<script>
async function shareToFacebook() {
  const shareUrl = `${window.location.origin}/pet/${petId}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  window.open(fbUrl, '_blank', 'width=600,height=400');

  // Track share
  await fetch(`/api/pets/${petId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform: 'facebook' })
  });
}

async function shareToTwitter() {
  const text = `Help find ${petName}! ${petType} lost in ${location}. #LostPet #FindingSweetie`;
  const shareUrl = `${window.location.origin}/pet/${petId}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  window.open(twitterUrl, '_blank', 'width=600,height=400');

  await fetch(`/api/pets/${petId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform: 'twitter' })
  });
}

async function shareToWhatsApp() {
  const text = `🐾 Help find ${petName}! ${petType} lost in ${location}. View details: ${window.location.origin}/pet/${petId}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');

  await fetch(`/api/pets/${petId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform: 'whatsapp' })
  });
}

// Native Web Share API (mobile)
async function shareNative() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Help find ${petName}`,
        text: `${petType} lost in ${location}`,
        url: `${window.location.origin}/pet/${petId}`
      });
    } catch (err) {
      console.log('Share cancelled');
    }
  }
}
</script>
```

### 5. Animal Shelter Integration

**File: `public/shelter-dashboard.html`**

```html
<!-- Shelter management interface -->
<div class="shelter-dashboard">
  <h1>Shelter Dashboard</h1>

  <!-- Bulk Import -->
  <section class="bulk-import">
    <h2>Bulk Import Pets</h2>
    <form id="bulk-import-form">
      <textarea id="csv-data" placeholder="Paste CSV data or JSON..."></textarea>
      <button type="submit">Import Pets</button>
    </form>
  </section>

  <!-- Current Inventory -->
  <section class="inventory">
    <h2>Current Inventory</h2>
    <div class="stats">
      <div class="stat-card">
        <h3>Total Pets</h3>
        <p id="total-pets">0</p>
      </div>
      <div class="stat-card">
        <h3>Available for Adoption</h3>
        <p id="adoption-count">0</p>
      </div>
      <div class="stat-card">
        <h3>Stray Hold</h3>
        <p id="stray-hold-count">0</p>
      </div>
      <div class="stat-card">
        <h3>Capacity</h3>
        <p id="capacity-usage">0%</p>
      </div>
    </div>
  </section>

  <!-- Match Notifications -->
  <section class="matches">
    <h2>Potential Matches</h2>
    <div id="match-list"></div>
  </section>
</div>

<script>
async function loadShelterDashboard() {
  const response = await fetch('/api/shelters/dashboard');
  const data = await response.json();

  document.getElementById('total-pets').textContent = data.totalPets;
  document.getElementById('adoption-count').textContent = data.adoptionCount;
  document.getElementById('stray-hold-count').textContent = data.strayHoldCount;

  const capacity = (data.totalPets / data.maxCapacity * 100).toFixed(1);
  document.getElementById('capacity-usage').textContent = `${capacity}%`;

  displayMatches(data.matches);
}

async function bulkImport() {
  const csvData = document.getElementById('csv-data').value;

  const response = await fetch('/api/shelters/bulk-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: csvData })
  });

  const result = await response.json();
  alert(`Imported ${result.count} pets successfully`);
  loadShelterDashboard();
}

loadShelterDashboard();
</script>
```

**Shelter API Endpoint:**

```javascript
// routes/shelters.js
router.post('/api/shelters/bulk-import', requireAuth, requireShelterAdmin, async (req, res) => {
  try {
    const { data } = req.body;
    const shelterId = req.session.shelterId;

    // Parse CSV or JSON
    const pets = parseImportData(data);

    let imported = 0;
    for (const pet of pets) {
      // Geocode address
      const coords = await geocode(pet.last_seen_location);

      // Create pet
      statements.createPet.run(
        req.session.userId,
        'Found', // Shelters typically have found pets
        pet.type,
        pet.name,
        pet.breed,
        pet.description,
        pet.comments,
        pet.microchip ? 1 : 0,
        pet.image_url,
        pet.location,
        coords?.latitude,
        coords?.longitude,
        shelterId,
        new Date().toISOString()
      );

      imported++;
    }

    res.json({ success: true, count: imported });
  } catch (error) {
    res.status(500).json({ error: 'Import failed', message: error.message });
  }
});
```

## API Endpoints Reference

### Chat/Messaging Endpoints

```
GET /api/conversations
  - Get user's conversations list

GET /api/conversations/:id/messages
  - Get messages in a conversation
  Query: ?limit=50&offset=0

POST /api/conversations
  - Start new conversation
  Body: { recipientId, petId?, initialMessage }

POST /api/messages
  - Send message (also via Socket.io)
  Body: { conversationId, recipientId, message, imageUrl? }

PATCH /api/messages/:id/read
  - Mark message as read

DELETE /api/messages/:id
  - Delete message

POST /api/users/:id/block
  - Block user from messaging
```

### SMS Endpoints

```
POST /api/sms/send
  - Send SMS to user
  Body: { recipientId, message }

POST /api/sms/verify
  - Send verification code
  Body: { phoneNumber }

POST /api/sms/verify-code
  - Verify SMS code
  Body: { phoneNumber, code }

GET /api/sms/credits
  - Get user's SMS credit balance

POST /api/sms/purchase-credits
  - Purchase SMS credits
  Body: { quantity, paymentMethod }
```

### Map Endpoints

```
GET /api/pets/map-data
  - Get pets with coordinates for map
  Query: ?bounds=lat1,lng1,lat2,lng2&status=Lost&type=Dog

GET /api/pets/nearby
  - Get pets near coordinates
  Query: ?lat=39.8&lng=-98.5&radius=25

POST /api/pets/:id/geocode
  - Add coordinates to pet from address

GET /api/geocode
  - Convert address to coordinates
  Query: ?address=123+Main+St,+City,+State
```

### Social Sharing Endpoints

```
POST /api/pets/:id/share
  - Track social share
  Body: { platform: 'facebook' | 'twitter' | 'instagram' | 'whatsapp' }

GET /api/pets/:id/share-card
  - Generate social media share card image

GET /api/pets/:id/share-stats
  - Get sharing statistics for pet
```

### Shelter Endpoints

```
GET /api/shelters
  - List registered shelters
  Query: ?zip=12345&radius=50&verified=true

GET /api/shelters/:id
  - Get shelter details

POST /api/shelters/:id/pets
  - Transfer pet to shelter

GET /api/shelters/:id/inventory
  - Get shelter's current pets

POST /api/shelters/bulk-import
  - Bulk import pets (shelter admin only)
  Body: { data: csvOrJson }

GET /api/shelters/dashboard
  - Shelter dashboard stats (shelter admin only)

POST /api/shelters/register
  - Register new shelter
  Body: { name, address, phone, email, type }
```

### Saved Search Endpoints

```
GET /api/saved-searches
  - Get user's saved searches

POST /api/saved-searches
  - Create saved search
  Body: { name, params: { zip, type, breed, radius }, notifyOnMatch }

DELETE /api/saved-searches/:id
  - Delete saved search

PUT /api/saved-searches/:id
  - Update saved search
```

## Testing Instructions

### Test 1: SMS Notifications

**Prerequisites:**
- Twilio account configured
- User phone number verified

**Steps:**
1. Log in to account
2. Go to Profile → Notification Settings
3. Enable SMS notifications
4. Verify phone number (receive verification code)
5. Create a lost pet report
6. Have friend create matching found pet
7. Wait for match detection (15 minutes max)
8. Verify SMS received with match details

**Expected Results:**
- Verification code SMS arrives within 1 minute
- Phone number marked as verified
- Match alert SMS received
- SMS includes pet type, location, and link
- Character count under 160 (single SMS)
- SMS credit deducted from account

### Test 2: Real-time Chat

**Prerequisites:**
- Two user accounts
- Socket.io server running

**Steps:**
1. User A logs in, opens chat
2. User B logs in, opens chat
3. User A starts conversation with User B about a pet
4. User A types message and sends
5. User B should see message appear instantly (no page refresh)
6. User B types reply
7. User A sees typing indicator ("User B is typing...")
8. Message appears for User A
9. Test image sharing in chat
10. Close chat, reopen - history should load

**Expected Results:**
- Messages appear instantly (<1 second)
- Typing indicators work
- Read receipts show when message read
- Images display inline
- Unread count badge accurate
- Chat history persists
- No duplicate messages

### Test 3: Interactive Map

**Steps:**
1. Navigate to /map.html
2. Map should load showing North America
3. Zoom in to your area
4. Click "Find Near Me" button
5. Grant location permission
6. Map centers on your location
7. Nearby pets appear as markers
8. Click marker - popup shows pet details
9. Filter map: Show only "Lost" pets
10. Filter by pet type: "Dogs"
11. Draw search radius tool

**Expected Results:**
- Map loads within 2 seconds
- Tiles load smoothly
- Markers cluster when zoomed out
- Lost pets show red markers
- Found pets show green markers
- Popup images load
- "View Details" link works
- Filters update markers in real-time
- Geolocation accurate within 100m

### Test 4: Social Media Sharing

**Steps:**
1. View a lost pet detail page
2. Click "Share on Facebook" button
3. Facebook share dialog opens
4. Verify preview shows:
   - Pet image
   - Pet name and description
   - "Finding Sweetie" branding
5. Post to Facebook (or cancel)
6. Try Twitter share button
7. Try WhatsApp share button
8. On mobile, try native share button
9. Check pet stats - share count incremented

**Expected Results:**
- Share dialogs open in popup windows
- Image preview displays correctly
- Share text includes hashtags
- Links point to correct pet page
- Share count increments
- Social cards are 1200x630px
- Cards include all pet details
- Branding/logo visible

### Test 5: Shelter Dashboard

**Prerequisites:**
- Shelter admin account

**Steps:**
1. Log in as shelter admin
2. Navigate to /shelter-dashboard.html
3. View current inventory stats
4. Prepare CSV with 5 test pets:
   ```
   type,name,breed,description,location,microchip
   Dog,Max,Labrador,Yellow lab found,123 Main St,yes
   Cat,Whiskers,Tabby,Orange cat,456 Oak Ave,no
   ```
5. Paste into bulk import form
6. Click "Import Pets"
7. Verify 5 pets imported
8. Check inventory count updated
9. View potential matches section
10. Mark a pet as adopted

**Expected Results:**
- Dashboard loads all statistics
- Capacity meter shows percentage
- Bulk import parses CSV correctly
- Pets geocoded and added to map
- Match detection runs for shelter pets
- Adoption status updates
- Email sent to adopter (if configured)

### Test 6: Saved Searches

**Steps:**
1. Go to lost pets search page
2. Set filters: ZIP 12345, radius 25 miles, type "Dog"
3. Click "Save This Search"
4. Name it "Local Lost Dogs"
5. Enable "Notify on new matches"
6. Navigate away from page
7. Have admin create matching pet in background
8. Wait for notification (check email/SMS/in-app)
9. Click notification link
10. Should go to search results with saved filters

**Expected Results:**
- Search saves with all parameters
- Search appears in "Saved Searches" list
- Notification sent when match found
- Clicking saved search restores filters
- Can edit saved search
- Can delete saved search
- Notification includes match preview

### Test 7: Geolocation Features

**Steps:**
1. Create new lost pet report
2. Enter address: "1600 Amphitheatre Parkway, Mountain View, CA"
3. Click "Geocode Address" button
4. Map preview should show location pin
5. Verify coordinates populated
6. Submit pet report
7. Go to map view
8. Pet marker appears at correct location
9. Click "Find Near Me"
10. Distance shown from your location to pet

**Expected Results:**
- Address geocoded within 2 seconds
- Coordinates accurate (±100m)
- Map preview shows exact location
- Marker appears on public map
- Distance calculation accurate
- Multiple pets show clustered markers
- Clicking cluster zooms in

## File Structure

```
/var/www/claude_sweets/
├── database/
│   ├── db.js                              # Updated with new tables
│   ├── schema.sql                         # Updated schema
│   └── migrations/
│       └── phase6.js                      # Phase 6 migration
├── services/
│   ├── sms/
│   │   ├── twilioService.js              # SMS sending logic
│   │   └── smsQueue.js                   # SMS queue management
│   ├── chat/
│   │   ├── socketServer.js               # Socket.io server
│   │   ├── messageHandler.js             # Message processing
│   │   └── profanityFilter.js           # Content moderation
│   ├── maps/
│   │   ├── geocodingService.js          # Address to coordinates
│   │   └── distanceCalculator.js        # Geographic distance
│   ├── social/
│   │   ├── shareCardGenerator.js        # Social media images
│   │   └── shareTracker.js              # Track shares
│   └── shelters/
│       ├── shelterService.js             # Shelter management
│       └── bulkImporter.js               # CSV/JSON import
├── routes/
│   ├── messages.js                        # NEW: Chat endpoints
│   ├── sms.js                             # NEW: SMS endpoints
│   ├── shelters.js                        # NEW: Shelter endpoints
│   ├── social.js                          # NEW: Social sharing
│   ├── pets.js                            # Updated with map endpoints
│   └── users.js                           # Updated with geolocation
├── public/
│   ├── map.html                           # NEW: Interactive map
│   ├── chat.html                          # NEW: Chat interface
│   ├── shelter-dashboard.html            # NEW: Shelter admin
│   ├── share-cards/                      # Generated share images
│   ├── map-markers/                      # Custom map marker icons
│   ├── js/
│   │   ├── map.js                        # Map functionality
│   │   ├── chat.js                       # Chat client
│   │   └── socket-client.js              # Socket.io client
│   └── css/
│       ├── map.css                       # Map styles
│       └── chat.css                      # Chat UI styles
├── uploads/
│   └── chat/                             # Chat image uploads
├── socketServer.js                        # NEW: Socket.io entry point
├── ecosystem.config.js                    # NEW: PM2 configuration
└── .env                                   # Updated with new config
```

## Environment Variables Reference

```bash
# Twilio SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
ENABLE_SMS_NOTIFICATIONS=true
SMS_RATE_LIMIT=10
SMS_COST_PER_MESSAGE=0.0075
FREE_SMS_CREDITS=10

# Socket.io
SOCKET_IO_PORT=3001
SOCKET_IO_PATH=/socket.io
ENABLE_WEBSOCKETS=true
WEBSOCKET_CORS_ORIGIN=http://localhost:3000

# Maps & Geolocation
MAP_DEFAULT_CENTER_LAT=39.8283
MAP_DEFAULT_CENTER_LNG=-98.5795
MAP_DEFAULT_ZOOM=4
MAPBOX_ACCESS_TOKEN=pk.xxxxxx (optional)
GEOCODING_PROVIDER=openstreetmap
GEOCODING_API_KEY= (optional, for premium services)
ENABLE_GEOLOCATION=true

# Social Media
FACEBOOK_APP_ID=your_fb_app_id
TWITTER_API_KEY=your_twitter_key
SHARE_CARD_STORAGE=public/share-cards
ENABLE_SOCIAL_SHARING=true

# Shelter Integration
ENABLE_SHELTER_PORTAL=true
SHELTER_API_RATE_LIMIT=1000
SHELTER_VERIFICATION_REQUIRED=true

# Security
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_PROFANITY_FILTER=true
MAX_MESSAGE_LENGTH=1000
MAX_CHAT_IMAGE_SIZE=5242880

# Performance
SOCKET_IO_PING_TIMEOUT=60000
SOCKET_IO_PING_INTERVAL=25000
MESSAGE_CACHE_TTL=3600
GEOCODING_CACHE_TTL=86400
```

## PM2 Configuration (Production)

**File: `ecosystem.config.js`**

```javascript
module.exports = {
  apps: [
    {
      name: 'finding-sweetie-web',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'finding-sweetie-sockets',
      script: 'socketServer.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        SOCKET_IO_PORT: 3001
      }
    },
    {
      name: 'finding-sweetie-scheduler',
      script: 'services/scheduler.js',
      instances: 1,
      cron_restart: '0 */6 * * *' // Restart every 6 hours
    }
  ]
};
```

**Start with PM2:**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Success Criteria

Phase 6 is successfully implemented when:

- ✅ Users can send/receive SMS notifications
- ✅ Phone verification works correctly
- ✅ Real-time chat delivers messages instantly
- ✅ Typing indicators and read receipts functional
- ✅ Interactive map displays all active pets
- ✅ Geolocation accurately shows user position
- ✅ Map markers cluster properly when zoomed out
- ✅ Social share cards generate correctly
- ✅ Facebook/Twitter/WhatsApp sharing works
- ✅ Share tracking increments counts
- ✅ Shelter dashboard loads statistics
- ✅ Bulk import parses CSV/JSON correctly
- ✅ Shelter pets appear on map
- ✅ Saved searches trigger notifications
- ✅ Distance calculations accurate
- ✅ Socket.io server stable under load
- ✅ No message loss in chat
- ✅ SMS credits properly deducted
- ✅ Rate limiting prevents abuse

## Performance Benchmarks

| Operation | Target | Acceptable | Notes |
|-----------|--------|------------|-------|
| SMS send | <3s | <8s | Via Twilio API |
| Message delivery | <500ms | <2s | Socket.io |
| Map load (100 pets) | <2s | <5s | Initial render |
| Geocoding | <1s | <3s | Per address |
| Share card generation | <2s | <5s | Per image |
| Chat history load | <1s | <3s | 50 messages |
| Shelter bulk import | <10s | <30s | 100 pets |
| Distance calculation | <100ms | <500ms | Per query |

## Security Considerations

### Chat Security
- **Content moderation**: Profanity filter on all messages
- **Rate limiting**: Max 50 messages per minute
- **Image validation**: Max 5MB, image types only
- **User blocking**: Block feature to prevent harassment
- **Report system**: Flag inappropriate content
- **Message encryption**: Consider end-to-end encryption (future)

### SMS Security
- **Phone verification**: Required before SMS
- **Rate limiting**: Max 10 SMS per day for free tier
- **Cost controls**: Alert when credits low
- **Spam prevention**: Verify legitimate use cases
- **Number validation**: E.164 format required

### Map Security
- **Location privacy**: Option to obscure exact location
- **Address validation**: Verify addresses exist
- **Radius limits**: Max 100 miles search radius
- **Coordinate sanitization**: Prevent SQL injection

### API Security
- **Authentication**: All endpoints require auth
- **Rate limiting**: Strict limits on public endpoints
- **CORS**: Whitelist allowed origins
- **Input validation**: Sanitize all user input
- **SQL injection**: Use prepared statements
- **XSS prevention**: Escape all output

## Troubleshooting

### Issue: SMS not sending

**Check:**
```bash
# Verify Twilio credentials
curl -X GET 'https://api.twilio.com/2010-04-01/Accounts/YOUR_SID.json' \
  -u YOUR_SID:YOUR_AUTH_TOKEN

# Check SMS logs
sqlite3 database/findingsweetie.db "SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10;"

# Test Twilio number
npm run test-twilio
```

**Common causes:**
- Invalid credentials
- Phone number not verified (trial account)
- Insufficient Twilio balance
- Rate limit exceeded
- Invalid phone number format

### Issue: Chat messages not delivering

**Check:**
```bash
# Verify Socket.io server running
netstat -tuln | grep 3001

# Check Socket.io connection
curl http://localhost:3001/socket.io/

# Check browser console for Socket.io errors
```

**Debug:**
```javascript
// Add to socket client
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Issue: Map not loading

**Check:**
1. Browser console for JavaScript errors
2. Network tab - verify tile requests
3. Check CORS headers
4. Verify pets have coordinates

**Solutions:**
```bash
# Verify pets have coordinates
sqlite3 database/findingsweetie.db "SELECT COUNT(*) FROM pets WHERE latitude IS NOT NULL;"

# Geocode missing pets
npm run geocode-all-pets
```

### Issue: Social share cards not generating

**Check:**
```bash
# Verify Jimp installation
npm list jimp

# Check write permissions
ls -la public/share-cards/

# Test card generation
npm run test-share-card 1
```

**Memory issues:**
```javascript
// Reduce image quality in shareCardGenerator.js
card.quality(60); // Lower quality = less memory
```

## Cost Analysis

### SMS (Twilio)
- **Cost per SMS**: $0.0075 (US)
- **Cost per verification**: $0.0075 × 2 = $0.015
- **Monthly estimate** (100 active users, 10 alerts/month each):
  - 100 × 10 = 1,000 SMS
  - 1,000 × $0.0075 = $7.50/month

### Maps (OpenStreetMap)
- **Cost**: Free (unlimited)
- **Alternative**: Mapbox ($5/month for 50,000 requests)

### Socket.io (Self-hosted)
- **Cost**: Server resources only
- **RAM**: ~100MB per 1,000 concurrent connections
- **Bandwidth**: ~1KB per message

### Total Monthly Cost Estimate
- **Free tier**: $0-10/month (OpenStreetMap + basic SMS)
- **Growing app** (1,000 users): $75-100/month
- **Large scale** (10,000 users): $500-750/month

## Migration from Phase 5

```bash
# 1. Backup
cp database/findingsweetie.db database/findingsweetie.db.backup-phase5

# 2. Install dependencies
npm install

# 3. Update .env
cp .env .env.backup
# Add new Phase 6 variables

# 4. Run migration
npm start
# Migration runs automatically

# 5. Verify
npm run verify-phase6

# 6. Start Socket.io
pm2 start ecosystem.config.js
```

## Next Steps (Future Enhancements)

Potential Phase 7 features:
- **AI breed identification** from photos (TensorFlow.js)
- **Voice calls** via Twilio Voice
- **Video chat** for pet verification
- **Blockchain** pet ownership records
- **DNA matching** for purebreds
- **Pet insurance** integration
- **Veterinary** clinic partnerships
- **Lost pet drones** coordination
- **Facial recognition** for pets
- **Multilingual** support (i18n)
- **Native mobile apps** (React Native)
- **Wearable integration** (GPS collars)

## Support Resources

- **Twilio Docs**: https://www.twilio.com/docs
- **Socket.io Docs**: https://socket.io/docs/
- **Leaflet Docs**: https://leafletjs.com/reference.html
- **Jimp Docs**: https://github.com/jimp-dev/jimp
- **PM2 Docs**: https://pm2.keymetrics.io/docs/

## Conclusion

Phase 6 transforms Finding Sweetie into a comprehensive, real-time platform with advanced communication and discovery tools. The SMS alerts provide instant notifications, real-time chat enables direct communication, and interactive maps make visual search intuitive.

Focus on thorough testing of real-time features, monitor Socket.io performance, and manage SMS costs carefully. The shelter integration opens partnership opportunities that can significantly increase your database of found pets.

---

**Branch:** `claude/phase6-realtime-communication`
**Estimated Implementation Time:** 40-60 hours
**Dependencies**: 10 new npm packages
**Database Changes:** 6 new tables, 11 new columns
**New Files:** ~25 files
**API Endpoints:** +30 endpoints
**Infrastructure:** Requires Socket.io server + PM2 for production
