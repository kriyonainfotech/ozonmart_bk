const nodemailer = require("nodemailer");
const otpTemplate = require("../templates/otpTemplate");

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const sendEmail = async ({ to, subject, text, html }) => {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
        from: `"Seller Panel" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: text || "",
        html,
    });

    console.log("✅ Email sent:", info.messageId);
    return info;
};

const sendOtpEmail = async ({ to, fullName, otp, minutes = 10 }) => {
    const html = otpTemplate({ fullName, otp, minutes });
    const subject = "Your Seller Panel OTP — Verify your email";
    return sendEmail({ to, subject, html, text: `Your OTP is ${otp}. It expires in ${minutes} minutes.` });
};

module.exports = { sendEmail, sendOtpEmail };
