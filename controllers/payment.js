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
        
        let customerExists = false;
        if (stripeCustomerId) {
            try {
                await stripe.customers.retrieve(stripeCustomerId);
                customerExists = true;
            } catch (err) {
                console.log(`⚠️ Customer ${stripeCustomerId} not found in current Stripe environment. Creating new one.`);
                customerExists = false;
            }
        }

        if (!stripeCustomerId || !customerExists) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: userId.toString()
                }
            });
            stripeCustomerId = customer.id;

            // Save new customer ID to user
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
    // 1. Log the arrival of the event
    console.log("-----------------------------------------");
    console.log("🔔 Stripe Webhook Received!");
    
    if (!stripe) {
        console.error("❌ Stripe is not initialized!");
        return res.status(500).json({ error: 'Stripe is not configured' });
    }
    
    // Convert Buffer to String for human-readable logging
    const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
    console.log("📦 Raw Body Content Snippet:", rawBody.substring(0, 100) + "...");
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
        console.error("❌ MISSING STRIPE SIGNATURE HEADER!");
        return res.status(400).send("No signature found");
    }

    if (!(req.body instanceof Buffer)) {
        console.warn("⚠️ WARNING: req.body is NOT a Buffer. It might have been already parsed as JSON, which will break signature verification.");
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log("✅ Webhook Verified. Event Type:", event.type);
    } catch (err) {
        console.error('❌ WEBHOOK VERIFICATION FAILED:', err.message);
        console.log("💡 Tip: Checking secret:", process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + "...");
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
        case 'invoice.payment_succeeded':
            const invoice = event.data.object;
            if (invoice.subscription) {
                const sub = await stripe.subscriptions.retrieve(invoice.subscription);
                await handleSubscriptionUpdated(sub);
            }
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

    if (!userId) {
        console.warn("⚠️ No userId found in session metadata. Cannot update database.");
        return;
    }

    let currentPeriodEnd = null;
    if (stripeSubscriptionId) {
        try {
            const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
        } catch (err) {
            console.error("❌ Failed to retrieve subscription details:", err.message);
        }
    }

    // Ensure planId matches the Mongoose enum ('free', 'monthly', 'yearly')
    const validPlan = ['monthly', 'yearly'].includes(planId) ? planId : 'monthly';

    await User.findByIdAndUpdate(userId, {
        subscription: {
            status: 'active',
            plan: validPlan,
            stripeCustomerId,
            stripeSubscriptionId,
            currentPeriodEnd: currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Fallback to 30 days if null
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
    const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

    const updateData = {
        'subscription.status': status === 'active' ? 'active' : 'past_due'
    };
    
    if (currentPeriodEnd) {
        updateData['subscription.currentPeriodEnd'] = currentPeriodEnd;
    }

    await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': stripeSubscriptionId },
        updateData
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

export const getSubscription = async (req, res) => {
    try {
        const userId = req.auth._id;
        const user = await User.findById(userId).select('subscription');
        res.json(user.subscription || { status: 'none', plan: 'free' });
    } catch (err) {
        console.error('GET_SUBSCRIPTION_ERROR', err);
        res.status(500).json({ error: 'Could not fetch subscription' });
    }
};
