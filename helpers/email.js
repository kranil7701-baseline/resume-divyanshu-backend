import nodemailer from 'nodemailer';
import "dotenv/config.js";

export const sendWelcomeEmail = async (userEmail, userName) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_FROM,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: `"ResumeCraft" <${process.env.EMAIL_FROM}>`,
            to: userEmail,
            subject: 'Welcome to ResumeCraft! 🚀',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center;">
                        <h1 style="color: #4f46e5;">Welcome to ResumeCraft, ${userName}!</h1>
                    </div>
                    <p>We're thrilled to have you on board. ResumeCraft is designed to help you build professional, standout resumes with ease.</p>
                    <p>Here are your first steps:</p>
                    <ul>
                        <li><strong>Complete your profile:</strong> Fill in your experience, skills, and education.</li>
                        <li><strong>Choose a template:</strong> Pick from our range of modern designs.</li>
                        <li><strong>Generate your resume:</strong> Use our AI-powered tools to polish your content.</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.CLIENT_URL}/dashboard" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
                    </div>
                    <p>If you have any questions, feel free to reply to this email. We're here to help!</p>
                    <p>Cheers,<br>The ResumeCraft Team</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 11px; color: #888; text-align: center;">&copy; 2026 ResumeCraft. All rights reserved.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        return false;
    }
};
