// Load environment configuration
const config = require('./config/env');

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
const stripe = require('stripe')(config.STRIPE_SECRET_KEY);

// Import middleware
const auth = require('./middleware/auth');

// Import routes
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profileRoutes');
const scholarshipRoutes = require('./routes/scholarships');
const dashboardRoutes = require('./routes/dashboard');

// Create Express app
const app = express();

// Initialize in-memory database
global.inMemoryDB = {
    users: new Map(),
    scholarships: new Map(),
    applications: new Map(),
    formAnswers: new Map()
};

// Middleware
app.use(express.json());
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
    }
}));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working', timestamp: Date.now() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ error: 'Invalid token or no token provided' });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404 errors
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Connect to MongoDB and start server
mongoose.connect(config.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        
        app.listen(config.PORT, () => {
            console.log(`Server is running on port ${config.PORT}`);
            console.log('Environment:', {
                nodeEnv: config.NODE_ENV,
                port: config.PORT,
                corsOrigin: config.CORS_ORIGIN,
                hasStripeSecret: !!config.STRIPE_SECRET_KEY,
                hasStripePublishable: !!config.STRIPE_PUBLISHABLE_KEY,
                hasPriceId: !!config.STRIPE_PRICE_ID,
                hasWebhookSecret: !!config.STRIPE_WEBHOOK_SECRET,
                hasJwtSecret: !!config.JWT_SECRET,
                hasMongoDB: !!config.MONGODB_URI
            });
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });