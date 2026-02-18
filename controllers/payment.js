import "dotenv/config.js";
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/user.js';
import Transaction from '../models/transaction.js';

const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : (console.warn("⚠️ STRIPE_SECRET_KEY is missing. Stripe payments will not work."), null);

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    : (console.warn("⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Razorpay payments will not work."), null);

export const createCheckoutSession = async (req, res) => {
    if (!stripe) return res.status(500).json({ error: 'Stripe is not configured on the server' });
    try {
        const { planId } = req.body;
        const userId = req.auth._id; // From requireSignin middleware

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let priceId;
        if (planId === 'monthly') {
            priceId = process.env.STRIPE_MONTHLY_PRICE_ID;
        } else if (planId === 'yearly') {
            priceId = process.env.STRIPE_YEARLY_PRICE_ID;
        } else {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        // Create or get Stripe customer
        let stripeCustomerId = user.subscription?.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: userId.toString()
                }
            });
            stripeCustomerId = customer.id;

            // Save customer ID to user
            await User.findByIdAndUpdate(userId, {
                'subscription.stripeCustomerId': stripeCustomerId
            });
        }

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.CLIENT_URL}/dashboard?payment=success`,
            cancel_url: `${process.env.CLIENT_URL}/pricing?payment=cancel`,
            metadata: {
                userId: userId.toString(),
                planId: planId
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (err) {
        console.error('STRIPE_CHECKOUT_ERROR', err);
        res.status(500).json({ error: 'Could not create checkout session' });
    }
};

export const stripeWebhook = async (req, res) => {
    if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' });
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('WEBHOOK_ERROR', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            await handleSubscriptionCreated(session);
            break;
        case 'customer.subscription.updated':
            const subscriptionUpdated = event.data.object;
            await handleSubscriptionUpdated(subscriptionUpdated);
            break;
        case 'customer.subscription.deleted':
            const subscriptionDeleted = event.data.object;
            await handleSubscriptionDeleted(subscriptionDeleted);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};

async function handleSubscriptionCreated(session) {
    const userId = session.metadata.userId;
    const planId = session.metadata.planId;
    const stripeSubscriptionId = session.subscription;
    const stripeCustomerId = session.customer;

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    await User.findByIdAndUpdate(userId, {
        subscription: {
            status: 'active',
            plan: planId,
            stripeCustomerId,
            stripeSubscriptionId,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
    });

    // Record Transaction
    await new Transaction({
        userId,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        paymentProvider: 'stripe',
        paymentId: session.id,
        status: 'completed',
        planId
    }).save();
}

async function handleSubscriptionUpdated(subscription) {
    const stripeSubscriptionId = subscription.id;
    const status = subscription.status; // active, past_due, etc.

    await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': stripeSubscriptionId },
        {
            'subscription.status': status === 'active' ? 'active' : 'past_due',
            'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000)
        }
    );
}

async function handleSubscriptionDeleted(subscription) {
    const stripeSubscriptionId = subscription.id;

    await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': stripeSubscriptionId },
        {
            'subscription.status': 'none',
            'subscription.plan': 'free',
            'subscription.stripeSubscriptionId': null,
            'subscription.currentPeriodEnd': null
        }
    );
}

export const createRazorpayOrder = async (req, res) => {
    if (!razorpay) return res.status(500).json({ error: 'Razorpay is not configured on the server' });
    try {
        const { planId } = req.body;
        // In INR: 10 USD -> ~850 INR, 70 USD -> ~5950 INR
        const amount = planId === 'monthly' ? 850 * 100 : 5950 * 100; // in paise

        const options = {
            amount: amount,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        console.error('RAZORPAY_ORDER_ERROR', err);
        res.status(500).json({ error: 'Could not create Razorpay order' });
    }
};

export const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planId
        } = req.body;

        const userId = req.auth._id;

        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature === razorpay_signature) {
            await User.findByIdAndUpdate(userId, {
                subscription: {
                    status: 'active',
                    plan: planId,
                    currentPeriodEnd: new Date(Date.now() + (planId === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000)
                }
            });

            // Record Transaction
            await new Transaction({
                userId,
                amount: planId === 'monthly' ? 10 : 70, // Converting to USD for consistency if needed, or keep INR
                currency: 'INR',
                paymentProvider: 'razorpay',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                status: 'completed',
                planId
            }).save();

            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Invalid payment signature' });
        }
    } catch (err) {
        console.error('RAZORPAY_VERIFY_ERROR', err);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

export const getUserTransactions = async (req, res) => {
    try {
        const userId = req.auth._id;
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (err) {
        console.error('GET_TRANSACTIONS_ERROR', err);
        res.status(500).json({ error: 'Could not fetch transaction history' });
    }
};

export const cancelSubscription = async (req, res) => {
    try {
        const userId = req.auth._id;
        const user = await User.findById(userId);

        if (!user || !user.subscription?.stripeSubscriptionId) {
            return res.status(400).json({ error: 'No active Stripe subscription found' });
        }

        // Cancel at period end
        await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        await User.findByIdAndUpdate(userId, {
            'subscription.status': 'canceled'
        });

        res.json({ message: 'Subscription will be canceled at the end of the current billing period' });
    } catch (err) {
        console.error('CANCEL_SUBSCRIPTION_ERROR', err);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
};
