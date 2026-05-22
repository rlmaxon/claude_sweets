require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { pool, initializeDatabase } = require('./database/db');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}
// Ensure uploads directory has write permissions
try {
  fs.accessSync(uploadsDir, fs.constants.W_OK);
} catch (err) {
  console.error('Warning: uploads directory is not writable');
}

// Import routes
const authRoutes = require('./routes/auth');
const petRoutes = require('./routes/pets');
const userRoutes = require('./routes/users');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to 0.0.0.0 for network access

// Trust CloudFront/EB proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded pet images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'finding-sweetie-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // CloudFront terminates SSL; session cookie travels over HTTP between CF and EB
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Session timeout middleware - reset maxAge on activity
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    req.session.touch(); // Reset session expiry on each request
  }
  next();
});

// Make user session data available to all routes
app.use((req, res, next) => {
  res.locals.user = req.session.userId || null;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/user', userRoutes);

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disconnected'
  });
});

// Temporary debug endpoint - remove after fixing auth
app.get('/api/debug/session', (req, res) => {
  res.json({
    sessionID: req.sessionID,
    session: req.session,
    cookies: req.headers.cookie || 'NO COOKIES RECEIVED',
    secure: req.secure,
    protocol: req.protocol,
    forwardedProto: req.headers['x-forwarded-proto'],
    host: req.headers.host
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connection established');
    await initializeDatabase();
    app.listen(PORT, HOST, () => {
      console.log(`Finding Sweetie server running on http://${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  pool.end().then(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  pool.end().then(() => process.exit(0));
});
