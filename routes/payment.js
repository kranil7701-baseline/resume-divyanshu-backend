import express from 'express';
import {
    createCheckoutSession,
    createRazorpayOrder,
    verifyRazorpayPayment,
    getUserTransactions,
    cancelSubscription,
    getSubscription
} from '../controllers/payment.js';
import { requireSignin } from '../controllers/auth.js';

const router = express.Router();

// Stripe Routes
router.post('/stripe/create-checkout-session', requireSignin, createCheckoutSession);

// Razorpay Routes
router.post('/razorpay/order', requireSignin, createRazorpayOrder);
router.post('/razorpay/verify', requireSignin, verifyRazorpayPayment);

// Common Routes
router.get('/subscription', requireSignin, getSubscription);
router.get('/transactions', requireSignin, getUserTransactions);
router.post('/cancel-subscription', requireSignin, cancelSubscription);

export default router;
