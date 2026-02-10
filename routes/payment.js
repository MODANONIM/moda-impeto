const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const Order = require('../models/Order');

// Lazy initialization to ensure env vars are loaded
let stripe;
const getStripe = () => {
    if (!stripe) {
        stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
};

// Create Payment Intent
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'jpy', metadata } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const paymentIntent = await getStripe().paymentIntents.create({
            amount: Math.round(amount), // JPY doesn't use decimals
            currency: currency,
            metadata: metadata || {},
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stripe Webhook Handler
// IMPORTANT: This route must use express.raw() for webhook signature verification
// The raw body parsing is applied in server.js before this route
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // If no webhook secret is configured, skip verification (development mode)
    if (!webhookSecret) {
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set - skipping signature verification (development mode)');
        return res.json({ received: true, mode: 'development' });
    }

    let event;

    try {
        // Verify webhook signature
        event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('⚠️ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('✓ PaymentIntent succeeded:', paymentIntent.id);

            // Update order status if orderId is in metadata
            if (paymentIntent.metadata && paymentIntent.metadata.orderId) {
                try {
                    await Order.findOneAndUpdate(
                        { orderId: paymentIntent.metadata.orderId },
                        {
                            status: 'Processing',
                            paymentIntentId: paymentIntent.id,
                            paymentStatus: 'paid'
                        }
                    );
                    console.log('✓ Order updated:', paymentIntent.metadata.orderId);
                } catch (dbErr) {
                    console.error('Failed to update order:', dbErr);
                }
            }
            break;

        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object;
            console.log('✗ PaymentIntent failed:', failedIntent.id);

            // Update order status to failed
            if (failedIntent.metadata && failedIntent.metadata.orderId) {
                try {
                    await Order.findOneAndUpdate(
                        { orderId: failedIntent.metadata.orderId },
                        {
                            status: 'Cancelled',
                            paymentStatus: 'failed'
                        }
                    );
                } catch (dbErr) {
                    console.error('Failed to update order:', dbErr);
                }
            }
            break;

        case 'charge.refunded':
            const refund = event.data.object;
            console.log('↩ Charge refunded:', refund.id);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
});

module.exports = router;

