require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { db } = require('./database/db');

// Import routes
const authRoutes = require('./routes/auth');
const petRoutes = require('./routes/pets');
const userRoutes = require('./routes/users');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to 0.0.0.0 for network access

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
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    maxAge: 300000 // 5 minutes (300 seconds as per spec)
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
    database: db ? 'connected' : 'disconnected'
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
app.listen(PORT, HOST, () => {
  console.log(`🐾 Finding Sweetie server running on http://${HOST}:${PORT}`);
  console.log(`   Access locally: http://localhost:${PORT}`);
  console.log(`   Access on network: http://192.168.68.x:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  db.close();
  process.exit(0);
});
