# Phase 5: Email Notifications & Enhanced Features

## Overview

Phase 5 adds intelligent notification systems, enhanced search capabilities, printable flyers, and image optimization to help users find their lost pets faster and improve overall application performance.

## New Features

### 1. Email Notification System
- **Match alerts** when nearby lost/found pets are reported
- Intelligent matching algorithm (type, breed, location, date)
- Configurable email preferences per user
- Daily digest option to prevent email fatigue
- Unsubscribe links in all emails
- Email templates with pet images and details
- "I found this pet" response button in emails

### 2. Enhanced Search & Filtering
- **Distance-based search** using zip code proximity
- Date range filters (last 24h, 7 days, 30 days, custom)
- Breed autocomplete with suggestions
- Sort by: Most recent, Distance, Date reported
- Advanced filters: With/without microchip, with images only
- Search result count and map preview (optional)
- Save search preferences

### 3. Printable Flyer Generation
- **Generate PDF flyers** for lost pets
- QR code linking to pet's online profile
- Customizable templates (color/black-white)
- Multiple sizes: Letter, A4, 4x6 postcard
- Tear-off tabs with contact information
- Downloadable and print-ready
- "Share this flyer" social media integration

### 4. Image Optimization & Processing
- **Automatic image resizing** (max 1200px width)
- WebP conversion for 30-50% size reduction
- Thumbnail generation (150px, 300px, 600px)
- Progressive loading with blur-up effect
- EXIF data removal for privacy
- Image quality optimization
- Lazy loading improvements

### 5. User Engagement Features
- Recent activity dashboard
- Success stories page (reunited pets)
- Pet match suggestions notification
- User statistics (views, potential matches)
- Shareable pet profile links
- "Bump" listing to top (once per 7 days)

## Database Changes

### New Table: `notifications`
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('match', 'view', 'message', 'success')),
  pet_id INTEGER,
  match_pet_id INTEGER,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

### New Table: `pet_matches`
```sql
CREATE TABLE pet_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lost_pet_id INTEGER NOT NULL,
  found_pet_id INTEGER NOT NULL,
  match_score INTEGER DEFAULT 0,
  distance_miles INTEGER,
  date_difference_days INTEGER,
  notification_sent BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lost_pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (found_pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  UNIQUE(lost_pet_id, found_pet_id)
);

CREATE INDEX idx_matches_score ON pet_matches(match_score DESC);
```

### New Table: `email_queue`
```sql
CREATE TABLE email_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_at);
```

### Updated `users` Table
Add new notification preference columns:
```sql
ALTER TABLE users ADD COLUMN notify_matches BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN notify_digest BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN digest_frequency TEXT DEFAULT 'daily' CHECK(digest_frequency IN ('daily', 'weekly', 'never'));
ALTER TABLE users ADD COLUMN last_notification_sent TIMESTAMP;
```

### Updated `pets` Table
Add engagement tracking:
```sql
ALTER TABLE pets ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE pets ADD COLUMN last_bumped_at TIMESTAMP;
ALTER TABLE pets ADD COLUMN flyer_download_count INTEGER DEFAULT 0;
```

## New Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "nodemailer": "^6.9.8",
    "pdfkit": "^0.14.0",
    "qrcode": "^1.5.3",
    "sharp": "^0.33.2",
    "node-schedule": "^2.1.1",
    "zip-codes": "^1.0.7"
  }
}
```

### Package Descriptions:
- **nodemailer**: Email sending functionality
- **pdfkit**: PDF generation for flyers
- **qrcode**: QR code generation
- **sharp**: Fast image processing and optimization
- **node-schedule**: Scheduled tasks (email digests, match detection)
- **zip-codes**: ZIP code distance calculations

## Installation Instructions

### Step 1: Pull Latest Code

```bash
cd /var/www/claude_sweets
git checkout main  # or your working branch
git pull origin main
```

### Step 2: Install New Dependencies

```bash
npm install nodemailer pdfkit qrcode sharp node-schedule zip-codes
```

Verify installation:
```bash
npm list nodemailer pdfkit qrcode sharp node-schedule zip-codes
```

### Step 3: Configure Email Service

Create `.env` file in project root (if it doesn't exist):

```bash
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-app-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Finding Sweetie <noreply@findingsweetie.app>

# Application URL
APP_URL=http://localhost:3000

# Email Settings
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_BATCH_SIZE=50
EMAIL_RATE_LIMIT_PER_HOUR=100
```

**Gmail Setup:**
1. Use a dedicated Gmail account for the app
2. Enable 2-factor authentication
3. Generate an "App Password" in Google Account settings
4. Use the app password in EMAIL_PASSWORD

**Alternative Services:**
- SendGrid (recommended for production)
- AWS SES
- Mailgun
- SMTP server

### Step 4: Database Migration

The migration runs automatically on server startup. It will:
1. Create `notifications` table
2. Create `pet_matches` table
3. Create `email_queue` table
4. Add new columns to `users` table
5. Add new columns to `pets` table

**Manual migration** (optional):

```bash
# Backup database first
cp database/findingsweetie.db database/findingsweetie.db.backup-phase5

# Run migration
npm run migrate:phase5
```

### Step 5: Create Required Directories

```bash
# Create directories for generated files
mkdir -p public/flyers
mkdir -p public/thumbnails
mkdir -p logs

# Set permissions
chmod 755 public/flyers
chmod 755 public/thumbnails
chmod 755 logs
```

### Step 6: Start Server

```bash
npm start
```

Expected output:
```
Database initialized successfully
✅ Phase 5 migration complete
Email service configured: gmail
Background jobs scheduled:
  - Match detection: Every 15 minutes
  - Email digest: Daily at 9:00 AM
  - Cleanup old notifications: Daily at 2:00 AM
Server listening on port 3000
```

## Feature Implementation Details

### 1. Email Notification System

**File Structure:**
```
services/
├── email/
│   ├── emailService.js          # Email sending logic
│   ├── templates/
│   │   ├── matchAlert.js        # Match notification template
│   │   ├── dailyDigest.js       # Daily digest template
│   │   └── welcome.js           # Welcome email template
│   └── mailer.js                # Nodemailer configuration
```

**Email Templates:**

Templates use HTML with inline CSS for compatibility:
- Match alert: Shows matched pet with images, location, contact button
- Daily digest: Summary of all matches from the day
- Welcome email: Sent when user registers

**Background Jobs:**

Using `node-schedule`:
```javascript
// services/scheduler.js
const schedule = require('node-schedule');

// Run match detection every 15 minutes
schedule.scheduleJob('*/15 * * * *', async () => {
  await detectPetMatches();
});

// Send daily digests at 9 AM
schedule.scheduleJob('0 9 * * *', async () => {
  await sendDailyDigests();
});
```

**Match Algorithm:**

Scores based on:
- Pet type match: 40 points
- Breed similarity: 30 points
- Location proximity: 20 points (within 10 miles)
- Date proximity: 10 points (within 7 days)

Threshold: 50+ points triggers notification

### 2. Enhanced Search Features

**New Search Parameters:**
```javascript
GET /api/pets/lost?
  zip=12345
  &radius=25          // miles
  &type=Dog
  &breed=Golden
  &days=7             // last 7 days
  &has_chip=true
  &has_images=true
  &sort=distance      // distance, date, recent
  &page=1
  &limit=20
```

**Distance Calculation:**

Uses zip code database and haversine formula:
```javascript
const zipCodes = require('zip-codes');

function calculateDistance(zip1, zip2) {
  const loc1 = zipCodes.lookup(zip1);
  const loc2 = zipCodes.lookup(zip2);
  // Haversine formula implementation
  return distanceInMiles;
}
```

### 3. Printable Flyer Generation

**API Endpoint:**
```
POST /api/pets/:id/flyer
Body:
  {
    "template": "color" | "blackwhite",
    "size": "letter" | "a4" | "postcard",
    "includeTearoffs": true,
    "includeQR": true
  }

Response:
  {
    "success": true,
    "flyerUrl": "/flyers/pet-123-flyer.pdf"
  }
```

**PDF Generation:**

Uses PDFKit:
```javascript
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

async function generateFlyer(pet, options) {
  const doc = new PDFDocument({ size: options.size });

  // Add header
  doc.fontSize(36).text('LOST PET', { align: 'center' });

  // Add pet image
  if (pet.image_url) {
    doc.image(pet.image_url, { fit: [400, 400] });
  }

  // Add pet details
  doc.fontSize(16).text(`Type: ${pet.pet_type}`);
  doc.text(`Name: ${pet.pet_name}`);
  doc.text(`Last Seen: ${pet.last_seen_location}`);

  // Add QR code
  if (options.includeQR) {
    const qrCodeData = await QRCode.toDataURL(
      `${process.env.APP_URL}/pet/${pet.id}`
    );
    doc.image(qrCodeData, { width: 100 });
  }

  // Add tear-off tabs at bottom
  if (options.includeTearoffs) {
    addTearoffTabs(doc, pet);
  }

  return doc;
}
```

### 4. Image Optimization

**Automatic Processing:**

When images are uploaded:
```javascript
const sharp = require('sharp');

async function processImage(file) {
  const filename = file.filename;
  const inputPath = `uploads/${filename}`;

  // Create optimized version
  await sharp(inputPath)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(`uploads/optimized-${filename}.webp`);

  // Create thumbnails
  await sharp(inputPath)
    .resize(300, 300, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(`public/thumbnails/${filename}-300.webp`);

  await sharp(inputPath)
    .resize(150, 150, { fit: 'cover' })
    .webp({ quality: 75 })
    .toFile(`public/thumbnails/${filename}-150.webp`);

  // Remove EXIF data from original
  await sharp(inputPath)
    .rotate() // Auto-rotate based on EXIF
    .withMetadata(false)
    .toFile(`uploads/temp-${filename}`);

  return {
    original: inputPath,
    optimized: `uploads/optimized-${filename}.webp`,
    thumbnails: {
      small: `public/thumbnails/${filename}-150.webp`,
      medium: `public/thumbnails/${filename}-300.webp`
    }
  };
}
```

**Frontend Usage:**

```html
<picture>
  <source srcset="/thumbnails/pet-123-300.webp" type="image/webp">
  <img src="/uploads/pet-123.jpg" loading="lazy" alt="Pet">
</picture>
```

## API Endpoints Reference

### Notification Endpoints

```
GET /api/notifications
  - Get user's notifications (unread count, recent items)

PATCH /api/notifications/:id/read
  - Mark notification as read

POST /api/notifications/mark-all-read
  - Mark all notifications as read

GET /api/notifications/preferences
  - Get user's notification preferences

PUT /api/notifications/preferences
  - Update notification preferences
  Body: { notify_matches, notify_digest, digest_frequency }
```

### Search Endpoints (Enhanced)

```
GET /api/pets/search
  - Advanced search with all filters
  Query params: zip, radius, type, breed, days, has_chip, has_images, sort

GET /api/pets/:id/matches
  - Get potential matches for a pet
  Returns: Array of matched pets with scores

POST /api/pets/:id/bump
  - Bump pet listing to top (once per 7 days)
```

### Flyer Endpoints

```
POST /api/pets/:id/flyer
  - Generate printable flyer
  Body: { template, size, includeTearoffs, includeQR }
  Response: { flyerUrl }

GET /api/pets/:id/flyer/download
  - Download generated flyer PDF
```

### Statistics Endpoints

```
GET /api/pets/:id/stats
  - Get pet statistics (views, matches, flyer downloads)

GET /api/stats/recent-activity
  - Get recent site activity (recent posts, reunions)

GET /api/stats/success-stories
  - Get reunited pets for success stories page
```

## Testing Instructions

### Test 1: Email Configuration

**Steps:**
1. Configure `.env` file with email credentials
2. Start server and check logs for "Email service configured"
3. Register a new user account
4. Check email inbox for welcome message
5. Verify email contains correct app branding and links

**Expected Results:**
- Welcome email arrives within 1-2 minutes
- Email displays correctly in Gmail, Outlook, mobile
- All links work and point to correct URLs
- Unsubscribe link present and functional

### Test 2: Match Detection & Notifications

**Steps:**
1. Create a lost pet report (e.g., Lost Dog in ZIP 12345)
2. Wait 1 minute for background job
3. Create a found pet report matching criteria (same type, nearby ZIP)
4. Wait for next match detection cycle (max 15 minutes)
5. Check notifications bell icon in nav bar
6. Verify email notification received
7. Click "View Match" in email or notification

**Expected Results:**
- Match detected and appears in notifications
- Email sent with both pets' details and images
- Notification shows match score and distance
- Clicking notification navigates to matched pet's profile
- User can contact the other party

### Test 3: Enhanced Search Filters

**Steps:**
1. Navigate to /lost-pet.html
2. Open advanced filters panel
3. Set ZIP code and radius (e.g., 10 miles)
4. Select specific breed from autocomplete
5. Set date range (last 7 days)
6. Toggle "Has microchip" filter
7. Toggle "With images only" filter
8. Change sort order (by distance)
9. Verify results update correctly

**Expected Results:**
- All filters work correctly
- Results sorted by distance show nearest first
- Distance in miles displayed for each pet
- Breed autocomplete suggests matches as you type
- Filter combinations work together
- No results message if no matches

### Test 4: Flyer Generation

**Steps:**
1. Log in to account
2. Navigate to dashboard
3. Click on a lost pet
4. Click "Generate Flyer" button
5. Select options:
   - Template: Color
   - Size: Letter
   - Include tear-offs: Yes
   - Include QR code: Yes
6. Click "Generate"
7. Verify PDF downloads
8. Open PDF and check:
   - Pet image displays correctly
   - All pet details present
   - QR code scannable (use phone)
   - Tear-off tabs at bottom with contact info

**Expected Results:**
- PDF generates within 2-3 seconds
- File size reasonable (<500KB)
- Prints correctly on standard printer
- QR code scans and opens pet profile page
- Tear-off tabs easy to cut
- Professional appearance

### Test 5: Image Optimization

**Steps:**
1. Prepare test images:
   - Large image (5MB, 4000x3000px)
   - EXIF-heavy image from phone camera
   - Portrait orientation image
2. Upload images when reporting pet
3. Check browser Network tab
4. Verify WebP images loaded (not originals)
5. Check thumbnails generated in /thumbnails directory
6. Verify images auto-rotated correctly
7. Check file sizes reduced significantly

**Expected Results:**
- Large images resized to max 1200px
- WebP versions 30-50% smaller
- Thumbnails generated (150px, 300px)
- EXIF data removed
- Portrait images auto-rotated
- Page load significantly faster
- Image quality still good

### Test 6: Daily Digest Email

**Steps:**
1. Enable daily digest in notification preferences
2. Set digest frequency to "daily"
3. Create multiple pet match scenarios
4. Wait for scheduled digest time (9 AM default)
5. Or manually trigger: `npm run send-digests`
6. Check email inbox

**Expected Results:**
- Digest email arrives at scheduled time
- Contains all matches from the day
- Grouped by pet
- Summary statistics at top
- Links to view each match
- Option to disable digest at bottom

### Test 7: Notification Preferences

**Steps:**
1. Navigate to user profile/settings
2. Find notification preferences section
3. Toggle email notifications on/off
4. Change digest frequency (daily/weekly/never)
5. Save preferences
6. Create a test match scenario
7. Verify notifications respect preferences

**Expected Results:**
- Preferences save successfully
- If disabled, no emails sent (but in-app notifications still work)
- Digest frequency honored
- Changes take effect immediately
- Unsubscribe link in emails disables notifications

## File Structure

```
/var/www/claude_sweets/
├── database/
│   ├── db.js                         # Updated with new migrations
│   ├── schema.sql                    # Updated schema
│   └── migrations/
│       └── phase5.js                 # Phase 5 migration script
├── services/
│   ├── email/
│   │   ├── emailService.js          # Email sending logic
│   │   ├── mailer.js                # Nodemailer config
│   │   └── templates/
│   │       ├── matchAlert.js
│   │       ├── dailyDigest.js
│   │       └── welcome.js
│   ├── matching/
│   │   ├── matchEngine.js           # Pet matching algorithm
│   │   └── scoreCalculator.js      # Match scoring
│   ├── flyer/
│   │   ├── flyerGenerator.js        # PDF generation
│   │   └── qrCodeGenerator.js      # QR codes
│   ├── image/
│   │   ├── imageProcessor.js        # Sharp image processing
│   │   └── thumbnailGenerator.js   # Thumbnail creation
│   └── scheduler.js                  # Background jobs
├── routes/
│   ├── notifications.js              # NEW: Notification endpoints
│   ├── flyers.js                     # NEW: Flyer endpoints
│   ├── pets.js                       # Updated with enhanced search
│   └── users.js                      # Updated with preferences
├── public/
│   ├── dashboard.html                # Updated with notifications
│   ├── notifications.html            # NEW: Notifications page
│   ├── success-stories.html          # NEW: Success stories page
│   ├── flyers/                       # Generated flyer PDFs
│   └── thumbnails/                   # Generated thumbnails
├── .env                              # NEW: Environment variables
└── package.json                      # Updated dependencies
```

## Environment Variables Reference

```bash
# Email Configuration
EMAIL_SERVICE=gmail|sendgrid|ses|smtp
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-password-or-api-key
EMAIL_FROM=Finding Sweetie <noreply@findingsweetie.app>

# SMTP Configuration (if using custom SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false

# SendGrid (alternative)
SENDGRID_API_KEY=your-sendgrid-api-key

# Application
APP_URL=http://localhost:3000
NODE_ENV=development|production

# Email Settings
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_BATCH_SIZE=50
EMAIL_RATE_LIMIT_PER_HOUR=100
DIGEST_SEND_TIME=09:00

# Image Processing
IMAGE_MAX_WIDTH=1200
IMAGE_QUALITY=85
THUMBNAIL_SIZES=150,300,600
AUTO_WEBP_CONVERSION=true

# Matching Algorithm
MATCH_THRESHOLD=50
MATCH_RADIUS_MILES=25
MATCH_CHECK_INTERVAL=15

# Feature Flags
ENABLE_FLYER_GENERATION=true
ENABLE_MATCH_NOTIFICATIONS=true
ENABLE_IMAGE_OPTIMIZATION=true
```

## Success Criteria

Phase 5 is successfully implemented when:

- ✅ Users receive email notifications for matched pets
- ✅ Match detection runs automatically every 15 minutes
- ✅ Email preferences configurable per user
- ✅ Daily digest emails work correctly
- ✅ Enhanced search with distance filtering works
- ✅ Breed autocomplete functional
- ✅ Date range filters work correctly
- ✅ Printable flyers generate successfully
- ✅ QR codes scannable and link to pet profiles
- ✅ Images auto-optimized on upload
- ✅ WebP conversion reduces file sizes
- ✅ Thumbnails generated for all images
- ✅ Notification bell shows unread count
- ✅ In-app notification center functional
- ✅ Success stories page displays reunited pets
- ✅ All emails render correctly in major email clients
- ✅ No degradation in upload performance
- ✅ Database migration completes without errors

## Performance Considerations

### Email Rate Limiting

To prevent being flagged as spam:
- Max 100 emails per hour per user
- Batch processing with delays
- Exponential backoff on failures
- Queue system for high volume

### Image Processing

- Process images asynchronously
- Use worker threads for Sharp operations
- Cache thumbnails aggressively
- Serve WebP with JPEG fallback

### Database Optimization

New indexes for performance:
```sql
CREATE INDEX idx_pets_location_date ON pets(zip_code, created_at);
CREATE INDEX idx_pets_type_breed ON pets(pet_type, pet_breed);
CREATE INDEX idx_matches_notification ON pet_matches(notification_sent, match_score);
```

### Background Jobs

- Use separate process for scheduled tasks
- Implement job queue (optional: Bull or BeeQueue)
- Monitor job execution times
- Log all background job results

## Troubleshooting

### Issue: Emails not sending

**Causes:**
- Invalid SMTP credentials
- Gmail blocking "less secure apps"
- Rate limiting
- Network/firewall issues

**Solutions:**
```bash
# Test email configuration
npm run test-email

# Check email queue
sqlite3 database/findingsweetie.db "SELECT * FROM email_queue WHERE status='failed';"

# Retry failed emails
npm run retry-failed-emails

# Switch to SendGrid for production
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-key
```

### Issue: Match detection not running

**Check:**
```bash
# Verify scheduler is running
npm run check-scheduler

# Manually trigger match detection
npm run detect-matches

# Check logs
tail -f logs/scheduler.log
```

### Issue: Flyer generation fails

**Causes:**
- Missing directories
- Permission issues
- Large images timing out

**Solutions:**
```bash
# Create directories
mkdir -p public/flyers
chmod 755 public/flyers

# Increase timeout in flyerGenerator.js
timeout: 30000  // 30 seconds

# Check PDFKit installation
npm list pdfkit
```

### Issue: Image optimization slow

**Solutions:**
```javascript
// Use worker threads
const { Worker } = require('worker_threads');

// Process in background
async function optimizeAsync(imagePath) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./workers/imageOptimizer.js', {
      workerData: { imagePath }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
```

### Issue: High memory usage

**Sharp memory management:**
```javascript
// Limit concurrent operations
const pLimit = require('p-limit');
const limit = pLimit(2); // Max 2 concurrent

const promises = images.map(img =>
  limit(() => sharp(img).resize(1200).toFile(output))
);
```

## Migration from Phase 4

If you're migrating from Phase 4:

1. **Backup database:**
```bash
cp database/findingsweetie.db database/findingsweetie.db.backup-phase4
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Run migration:**
```bash
npm start
# Migration runs automatically
```

5. **Verify:**
```bash
# Check tables created
sqlite3 database/findingsweetie.db ".tables"
# Should see: notifications, pet_matches, email_queue

# Check new columns
sqlite3 database/findingsweetie.db "PRAGMA table_info(users);"
# Should see: notify_matches, notify_digest, digest_frequency
```

## Security Considerations

### Email Security

- Never expose email credentials in code
- Use environment variables
- Implement rate limiting
- Validate all email addresses
- Sanitize user input in email templates
- Include unsubscribe links (CAN-SPAM compliance)

### Image Processing

- Validate file types before processing
- Limit file sizes
- Remove EXIF GPS data for privacy
- Scan for malware (optional: ClamAV)

### API Security

- Authenticate all notification endpoints
- Rate limit flyer generation
- Prevent notification spam
- Validate all user input

## Next Steps (Future Enhancements)

Potential Phase 6 features:
- SMS notifications via Twilio
- Mobile app (React Native)
- Real-time chat between users
- Map view with pet locations
- AI-powered breed identification
- Integration with animal shelters
- Multi-language support
- Social media auto-posting
- Pet insurance partnerships
- Reward system for successful reunions

## Support

If you encounter issues during Phase 5 implementation:

1. **Check logs:**
   ```bash
   tail -f logs/app.log
   tail -f logs/email.log
   tail -f logs/scheduler.log
   ```

2. **Run diagnostics:**
   ```bash
   npm run diagnostics
   ```

3. **Test individual features:**
   ```bash
   npm run test-email
   npm run test-matching
   npm run test-flyer
   npm run test-image-processing
   ```

4. **Database issues:**
   ```bash
   npm run db-check
   npm run db-repair
   ```

5. **Review documentation:**
   - Nodemailer: https://nodemailer.com/
   - Sharp: https://sharp.pixelplumbing.com/
   - PDFKit: http://pdfkit.org/
   - Node-schedule: https://github.com/node-schedule/node-schedule

## Performance Benchmarks

Expected performance metrics:

| Operation | Target | Acceptable | Notes |
|-----------|--------|------------|-------|
| Email send | <2s | <5s | Per email |
| Match detection | <30s | <60s | Full scan |
| Flyer generation | <3s | <10s | With images |
| Image optimization | <5s | <15s | Per image |
| Thumbnail generation | <2s | <5s | All sizes |
| Search with filters | <500ms | <2s | 100 pets |
| Notification load | <300ms | <1s | User dashboard |

## Monitoring & Analytics

Recommended monitoring:

```javascript
// Track key metrics
const metrics = {
  emailsSent: 0,
  emailsFailed: 0,
  matchesDetected: 0,
  flyersGenerated: 0,
  imagesOptimized: 0,
  averageMatchScore: 0,
  notificationClickRate: 0
};

// Log to analytics service
analytics.track('match_detected', {
  score: matchScore,
  distance: distance,
  timeSinceReport: days
});
```

## Conclusion

Phase 5 adds significant value through intelligent notifications, enhanced discovery, and improved performance. The email notification system helps reunite pets faster, while image optimization improves user experience across all devices.

Focus on proper email configuration and testing the match detection algorithm thoroughly. Monitor performance metrics and user engagement to refine the matching algorithm over time.

---

**Branch:** `claude/phase5-notifications-enhancement`
**Estimated Implementation Time:** 20-30 hours
**Dependencies:** 6 new npm packages
**Database Changes:** 3 new tables, 7 new columns
**New Files:** ~15 files
**API Endpoints:** +12 endpoints
