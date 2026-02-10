import express from "express";
const router = express.Router();
import { signup, signin, googleLogin } from "../controllers/auth.js"

router.post('/signup', signup)
router.post('/signin', signin)
router.post('/google-login', googleLogin)

export default router