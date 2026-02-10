import User from "../models/user.js"
import jwt from "jsonwebtoken"
import _ from "lodash"
import { OAuth2Client } from "google-auth-library"
import { expressjwt } from "express-jwt"
import "dotenv/config.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


export const signup = async (req, res) => {
    try {
        const emailExists = await User.findOne({ email: req.body.email });
        if (emailExists) {
            return res.status(400).json({
                error: 'Email is taken'
            });
        }

        const usernameExists = await User.findOne({ username: req.body.username });
        if (usernameExists) {
            return res.status(400).json({
                error: 'Username is taken'
            });
        }

        const { name, username, email, password } = req.body;

        let usernameurl = username.toLowerCase();
        let profile = `${process.env.CLIENT_URL}/profile/${usernameurl}`;

        const newUser = new User({ name, username, email, password, profile });
        await newUser.save();

        res.json({
            message: 'Signup success! Please signin.'
        });
    } catch (err) {
        return res.status(400).json({
            error: err.message
        });
    }
};



export const signin = async (req, res) => {
    const { password } = req.body;
    try {
        const user = await User.findOne({ email: req.body.email }).exec();

        if (!user) { return res.status(400).json({ error: 'User with that email does not exist. Please sign up.' }); }
        if (!user.authenticate(password)) { return res.status(400).json({ error: 'Email and password do not match.' }); }
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '100d' });
        res.cookie('token', token, { expiresIn: '1d' });
        const { _id, username, name, email, role } = user;
        res.json({ token, user: { _id, username, name, email, role } });

    } catch (err) { res.status(400).json({ error: "somethig is wrong" }); }
};




export const signout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Signout success' });
};


export const requireSignin = expressjwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"],
    userProperty: "auth",
});


export const googleLogin = (req, res) => {
    const { idToken } = req.body;
    client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID }).then(response => {
        const { email_verified, name, email, jti } = response.payload;
        if (email_verified) {
            User.findOne({ email }).exec().then((user) => {
                if (user) {
                    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
                    res.cookie('token', token, { expiresIn: '7d' });
                    const { _id, email, name, role, username } = user;
                    return res.json({ token, user: { _id, email, name, role, username } });
                } else {
                    let username = _.snakeCase(name) + "_" + Math.random().toString(36).substring(2, 5);
                    let profile = `${process.env.CLIENT_URL}/profile/${username}`;
                    let password = jti + process.env.JWT_SECRET;
                    user = new User({ name, email, username, profile, password });
                    user.save().then((data) => {
                        const token = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
                        res.cookie('token', token, { expiresIn: '7d' });
                        const { _id, email, name, role, username } = data;
                        return res.json({ token, user: { _id, email, name, role, username } });
                    }).catch(err => {
                        return res.status(400).json({
                            error: err.message
                        });
                    });
                }
            });
        } else {
            return res.status(400).json({
                error: 'Google login failed. Try again.'
            });
        }
    });
};
