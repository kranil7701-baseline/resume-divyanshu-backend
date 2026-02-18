import express from "express";
const router = express.Router();
import { createCheckoutSession, stripeWebhook, createRazorpayOrder, verifyRazorpayPayment, getUserTransactions, cancelSubscription } from "../controllers/payment.js";
import { requireSignin } from "../controllers/auth.js";
import express_pkg from 'express';

router.post('/create-checkout-session', requireSignin, createCheckoutSession);
router.post('/create-razorpay-order', requireSignin, createRazorpayOrder);
router.post('/verify-razorpay-payment', requireSignin, verifyRazorpayPayment);
router.get('/history', requireSignin, getUserTransactions);
router.post('/cancel', requireSignin, cancelSubscription);

// Webhook raw body is handled in index.js
router.post('/webhook', stripeWebhook);

export default router;
