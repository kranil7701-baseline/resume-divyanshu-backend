import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            default: 'USD'
        },
        paymentProvider: {
            type: String,
            enum: ['stripe', 'razorpay'],
            required: true
        },
        paymentId: {
            type: String, // Stripe Session ID or Razorpay Payment ID
            required: true,
            unique: true
        },
        orderId: String, // For Razorpay
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        planId: {
            type: String,
            enum: ['monthly', 'yearly'],
            required: true
        }
    },
    { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
