# Computer Vision Implementation Example

This document shows practical code examples for implementing pet image validation using AWS Rekognition.

## Quick Start Implementation (1-2 days)

### 1. Install Dependencies

```bash
npm install @aws-sdk/client-rekognition
```

### 2. Environment Configuration

Add to `.env`:
```bash
# AWS Rekognition Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# CV Settings
CV_MIN_CONFIDENCE=70
CV_ENABLED=true
```

### 3. Create Image Validation Middleware

**File: `middleware/imageValidation.js`**

```javascript
const { RekognitionClient, DetectLabelsCommand } = require("@aws-sdk/client-rekognition");
const fs = require('fs').promises;

// Initialize AWS Rekognition client
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Pet-related labels to look for
const PET_LABELS = [
  'dog', 'cat', 'pet', 'animal', 'puppy', 'kitten',
  'bird', 'rabbit', 'bunny', 'canine', 'feline',
  'mammal', 'domestic animal'
];

/**
 * Validate that an image contains a pet
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} - Validation result
 */
async function validatePetImage(imagePath) {
  try {
    // Read image file
    const imageBuffer = await fs.readFile(imagePath);

    // Call Rekognition API
    const command = new DetectLabelsCommand({
      Image: {
        Bytes: imageBuffer
      },
      MaxLabels: 15,
      MinConfidence: parseFloat(process.env.CV_MIN_CONFIDENCE) || 70
    });

    const response = await rekognitionClient.send(command);

    // Check if any pet-related labels were detected
    const detectedLabels = response.Labels.map(label => ({
      name: label.Name,
      confidence: label.Confidence
    }));

    const isPet = response.Labels.some(label =>
      PET_LABELS.includes(label.Name.toLowerCase())
    );

    const petLabel = response.Labels.find(label =>
      PET_LABELS.includes(label.Name.toLowerCase())
    );

    return {
      valid: isPet,
      confidence: petLabel ? petLabel.Confidence : 0,
      detectedType: petLabel ? petLabel.Name : 'Unknown',
      allLabels: detectedLabels,
      message: isPet
        ? `Pet detected: ${petLabel.Name} (${petLabel.Confidence.toFixed(1)}% confidence)`
        : 'No pet detected in image'
    };

  } catch (error) {
    console.error('Rekognition error:', error);

    // If CV is enabled and fails, decide whether to allow or reject
    // For now, we'll allow (fail open) but log the error
    return {
      valid: true, // Fail open - allow upload if CV fails
      confidence: 0,
      detectedType: 'Unknown',
      allLabels: [],
      error: error.message,
      message: 'Image validation unavailable - upload allowed'
    };
  }
}

/**
 * Express middleware to validate uploaded pet images
 * Use AFTER multer but BEFORE saving to database
 */
async function validateUploadedImages(req, res, next) {
  // Skip if CV is disabled
  if (process.env.CV_ENABLED !== 'true') {
    return next();
  }

  // Skip if no files uploaded
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    // Validate each uploaded image
    const validationResults = [];
    const invalidFiles = [];

    for (const file of req.files) {
      const result = await validatePetImage(file.path);
      validationResults.push({
        filename: file.filename,
        ...result
      });

      if (!result.valid) {
        invalidFiles.push({
          filename: file.originalname,
          reason: result.message
        });
      }
    }

    // If any images are invalid, reject the entire upload
    if (invalidFiles.length > 0) {
      // Delete all uploaded files
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }

      return res.status(400).json({
        error: 'Invalid images detected',
        message: 'One or more images do not appear to contain pets',
        invalidFiles: invalidFiles,
        details: validationResults
      });
    }

    // Attach validation results to request for database storage
    req.cvResults = validationResults;

    next();

  } catch (error) {
    console.error('Image validation error:', error);
    // Fail open - allow upload if validation fails
    next();
  }
}

/**
 * Get breed information if available (Premium Rekognition feature)
 */
async function detectPetBreed(imagePath) {
  try {
    const imageBuffer = await fs.readFile(imagePath);

    // Use DetectLabels with specific categories
    const command = new DetectLabelsCommand({
      Image: { Bytes: imageBuffer },
      MaxLabels: 20,
      MinConfidence: 70,
      Features: ['GENERAL_LABELS']
    });

    const response = await rekognitionClient.send(command);

    // Look for breed-specific labels
    const breedLabels = response.Labels.filter(label =>
      label.Parents?.some(parent =>
        ['Dog', 'Cat', 'Pet'].includes(parent.Name)
      )
    );

    return breedLabels.map(label => ({
      breed: label.Name,
      confidence: label.Confidence
    }));

  } catch (error) {
    console.error('Breed detection error:', error);
    return [];
  }
}

module.exports = {
  validatePetImage,
  validateUploadedImages,
  detectPetBreed
};
```

---

### 4. Update Pet Routes

**File: `routes/pets.js`** (modifications)

```javascript
// Add at the top
const { validateUploadedImages } = require('../middleware/imageValidation');

// Modify the register endpoint (around line 43)
router.post('/register',
  requireAuth,
  upload.array('pet_images', 5),
  validateUploadedImages,  // <-- ADD THIS LINE
  validatePet,
  async (req, res) => {
    // ... existing code ...

    // NEW: Store CV results if available
    if (req.cvResults) {
      for (let i = 0; i < req.cvResults.length; i++) {
        const cvResult = req.cvResults[i];
        const imageFile = req.files[i];

        insertPetImageStmt.run(
          petId,
          `/uploads/${imageFile.filename}`,
          i === 0 ? 1 : 0,
          i,
          cvResult.detectedType || null,
          cvResult.confidence || null,
          JSON.stringify(cvResult.allLabels || [])
        );
      }
    } else {
      // Fallback to existing code
      // ... existing image insert code ...
    }

    // ... rest of existing code ...
  }
);

// Similarly for PUT endpoint (around line 278)
router.put('/:id',
  requireAuth,
  upload.array('pet_images', 5),
  validateUploadedImages,  // <-- ADD THIS LINE
  validatePet,
  async (req, res) => {
    // ... existing code ...
  }
);
```

---

### 5. Database Migration

**File: `database/migrations/001_add_cv_columns.sql`**

```sql
-- Add computer vision columns to pet_images table

ALTER TABLE pet_images ADD COLUMN cv_status TEXT DEFAULT 'validated';
-- Status: 'pending', 'validated', 'rejected', 'flagged', 'error'

ALTER TABLE pet_images ADD COLUMN cv_confidence REAL;
-- Confidence score from 0-100

ALTER TABLE pet_images ADD COLUMN cv_detected_type TEXT;
-- AI-detected type: Dog, Cat, Bird, etc.

ALTER TABLE pet_images ADD COLUMN cv_labels TEXT;
-- JSON array of all detected labels

ALTER TABLE pet_images ADD COLUMN cv_processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- When CV analysis was completed

ALTER TABLE pet_images ADD COLUMN cv_error TEXT;
-- Error message if analysis failed

-- Create index for querying by CV status
CREATE INDEX idx_pet_images_cv_status ON pet_images(cv_status);
```

Run migration:
```javascript
// In database/db.js or a migration script
const fs = require('fs');
const { db } = require('./db');

const migration = fs.readFileSync('./database/migrations/001_add_cv_columns.sql', 'utf8');
db.exec(migration);
console.log('Migration completed');
```

---

### 6. Update Database Insert Statements

**File: `database/db.js`** (add new prepared statement)

```javascript
// Add CV-aware insert statement
const insertPetImageWithCV = db.prepare(`
  INSERT INTO pet_images (
    pet_id,
    image_url,
    is_primary,
    display_order,
    cv_status,
    cv_confidence,
    cv_detected_type,
    cv_labels
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

module.exports = {
  db,
  // ... existing exports ...
  insertPetImageWithCV
};
```

---

### 7. Testing Script

**File: `test/test-image-validation.js`**

```javascript
require('dotenv').config();
const { validatePetImage } = require('../middleware/imageValidation');
const path = require('path');

async function testValidation() {
  console.log('Testing image validation...\n');

  const testImages = [
    './test/images/dog.jpg',
    './test/images/cat.png',
    './test/images/person.jpg',  // Should fail
    './test/images/landscape.jpg'  // Should fail
  ];

  for (const imagePath of testImages) {
    console.log(`Testing: ${imagePath}`);
    try {
      const result = await validatePetImage(imagePath);
      console.log('Result:', {
        valid: result.valid,
        type: result.detectedType,
        confidence: result.confidence.toFixed(1) + '%',
        message: result.message
      });
      console.log('Labels:', result.allLabels.slice(0, 5).map(l =>
        `${l.name} (${l.confidence.toFixed(1)}%)`
      ).join(', '));
    } catch (error) {
      console.error('Error:', error.message);
    }
    console.log('---\n');
  }
}

testValidation();
```

Run test:
```bash
node test/test-image-validation.js
```

---

### 8. Admin Dashboard Integration

**File: `routes/admin.js`** (new endpoint)

```javascript
// Get images flagged by CV
router.get('/flagged-images', requireAuth, requireAdmin, (req, res) => {
  try {
    const flaggedImages = db.prepare(`
      SELECT
        pi.*,
        p.pet_name,
        p.pet_type,
        u.email as owner_email
      FROM pet_images pi
      JOIN pets p ON pi.pet_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE pi.cv_status IN ('rejected', 'flagged')
      ORDER BY pi.created_at DESC
      LIMIT 50
    `).all();

    res.json({
      success: true,
      count: flaggedImages.length,
      images: flaggedImages
    });
  } catch (error) {
    console.error('Error fetching flagged images:', error);
    res.status(500).json({ error: 'Failed to fetch flagged images' });
  }
});

// Manually approve/reject an image
router.post('/review-image/:imageId', requireAuth, requireAdmin, (req, res) => {
  const { imageId } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  try {
    db.prepare(`
      UPDATE pet_images
      SET cv_status = ?
      WHERE id = ?
    `).run(
      action === 'approve' ? 'validated' : 'rejected',
      imageId
    );

    res.json({ success: true, message: 'Image reviewed' });
  } catch (error) {
    console.error('Error reviewing image:', error);
    res.status(500).json({ error: 'Failed to review image' });
  }
});
```

---

## AWS Setup Steps

### 1. Create AWS Account
1. Go to https://aws.amazon.com
2. Sign up (free tier includes 5,000 Rekognition API calls/month for first year)

### 2. Create IAM User
```bash
# Via AWS Console:
1. Go to IAM → Users → Add User
2. User name: finding-sweetie-rekognition
3. Access type: Programmatic access
4. Permissions: Attach policy "AmazonRekognitionFullAccess"
5. Save Access Key ID and Secret Access Key
```

### 3. Configure Environment
```bash
# Add to .env (NEVER commit this file!)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
CV_MIN_CONFIDENCE=70
CV_ENABLED=true
```

---

## Deployment Checklist

- [ ] Install AWS SDK: `npm install @aws-sdk/client-rekognition`
- [ ] Create AWS account and IAM user
- [ ] Add AWS credentials to `.env`
- [ ] Create `middleware/imageValidation.js`
- [ ] Run database migration (add CV columns)
- [ ] Update pet routes to use validation middleware
- [ ] Test with sample images
- [ ] Deploy to production
- [ ] Monitor AWS costs in CloudWatch
- [ ] Set up CloudWatch alarms for high usage

---

## Cost Monitoring

**File: `scripts/check-rekognition-costs.sh`**

```bash
#!/bin/bash
# Check Rekognition API usage

aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics UsageQuantity \
  --filter file://rekognition-filter.json
```

**File: `rekognition-filter.json`**
```json
{
  "Dimensions": {
    "Key": "SERVICE",
    "Values": ["Amazon Rekognition"]
  }
}
```

---

## Next Steps

1. **Set up AWS account** (~30 minutes)
2. **Install dependencies** (~5 minutes)
3. **Implement validation middleware** (~2 hours)
4. **Run database migration** (~15 minutes)
5. **Test with images** (~1 hour)
6. **Deploy to production** (~30 minutes)

**Total time: 4-6 hours for basic implementation**

---

## Alternative: Local TensorFlow.js Example

If you want to avoid AWS:

```bash
npm install @tensorflow/tfjs-node @tensorflow-models/coco-ssd
```

```javascript
const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const fs = require('fs').promises;
const jpeg = require('jpeg-js');

let model;

async function loadModel() {
  if (!model) {
    model = await cocoSsd.load();
  }
  return model;
}

async function validatePetImageLocal(imagePath) {
  const model = await loadModel();
  const imageBuffer = await fs.readFile(imagePath);
  const rawImageData = jpeg.decode(imageBuffer, { useTArray: true });

  const imageTensor = tf.browser.fromPixels(rawImageData);
  const predictions = await model.detect(imageTensor);

  const petClasses = ['dog', 'cat', 'bird', 'horse', 'sheep', 'cow', 'bear'];
  const isPet = predictions.some(pred =>
    petClasses.includes(pred.class) && pred.score > 0.7
  );

  return {
    valid: isPet,
    predictions: predictions
  };
}
```

**Pros**: No AWS costs, runs locally
**Cons**: Less accurate, CPU intensive, requires more setup

---

Ready to implement? Choose your approach and I can help you set it up!
