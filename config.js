require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    stripeConfig: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        priceId: process.env.STRIPE_PRICE_ID,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5500'
}; 