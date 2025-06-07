// Fetch Stripe configuration from server
async function loadStripeConfig() {
    try {
        const response = await fetch('/api/stripe-config');
        const config = await response.json();
        window.stripeConfig = config;
    } catch (error) {
        console.error('Failed to load Stripe configuration:', error);
    }
}

// Load configuration when the script loads
loadStripeConfig(); 