import express from "express";
const router = express.Router();
import { signup, signin, googleLogin, forgotPassword, resetPassword } from "../controllers/auth.js"

router.post('/signup', signup)
router.post('/signin', signin)
router.post('/google-login', googleLogin)
router.put('/forgot-password', forgotPassword);
router.put('/reset-password', resetPassword);

export default router