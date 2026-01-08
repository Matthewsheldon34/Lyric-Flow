const nodemailer = require("nodemailer");
require('dotenv').config(); // Add this to load .env variables

console.log("🔍 Testing email configuration...");
console.log("Email:", process.env.EMAIL_USER);
console.log("App Password length:", process.env.APP_PASSWORD?.length);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.APP_PASSWORD
  }
});

async function sendMail() {
  try {
    console.log("🔗 Testing SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    console.log("📤 Sending test email...");
    await transporter.sendMail({
      from: `"Lyric Flow Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: "Test Email from Lyric Flow",
      text: "Hello from Node.js! If you receive this, email is working!",
      html: "<h1>Test Email Successful!</h1><p>Your Lyric Flow email configuration is working correctly.</p>"
    });

    console.log("✅ Email sent successfully!");
    console.log("📨 Check your Gmail inbox for the test email.");
    
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
    
    if (error.code === 'EAUTH') {
      console.log("\n🔐 Authentication failed. Check:");
      console.log("• 2-Factor Authentication is enabled on your Gmail");
      console.log("• You're using App Password (not regular password)");
      console.log("• No spaces in App Password");
      console.log("• App Password was generated for 'Mail'");
    }
  }
}

sendMail();