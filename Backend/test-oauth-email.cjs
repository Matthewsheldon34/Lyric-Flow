require('dotenv').config();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

console.log("🔍 OAuth2 Email Debug...");
console.log("Email:", process.env.EMAIL_USER);
console.log("Client ID:", process.env.GOOGLE_CLIENT_ID_EMAIL ? "✅ Set" : "❌ Missing");
console.log("Client Secret:", process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Missing");
console.log("Refresh Token:", process.env.GOOGLE_REFRESH_TOKEN ? "✅ Set" : "❌ Missing");

const createTransporter = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID_EMAIL,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        console.error("❌ Failed to get access token:", err);
        reject("Failed to create access token");
      }
      resolve(token);
    });
  });

  console.log("✅ Access token generated");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_USER,
      accessToken,
      clientId: process.env.GOOGLE_CLIENT_ID_EMAIL,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
  });

  return transporter;
};

async function testEmail() {
  try {
    console.log("\n🔗 Creating OAuth2 transporter...");
    const transporter = await createTransporter();
    
    console.log("🔗 Testing OAuth2 connection...");
    await transporter.verify();
    console.log("✅ OAuth2 connection verified");

    console.log("\n📤 Sending email via OAuth2...");
    const result = await transporter.sendMail({
      from: `"Lyric Flow" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "OAuth2 Test Email",
      text: "This is a test email using OAuth2 authentication!",
      html: "<h1>OAuth2 Test Successful!</h1><p>Your OAuth2 email configuration is working correctly.</p>"
    });

    console.log("✅ OAuth2 email sent successfully!", result.messageId);
    console.log("📨 Check your Gmail inbox for the test email.");
    
  } catch (error) {
    console.error("❌ OAuth2 test failed:", error.message);
    
    if (error.code === 'EAUTH') {
      console.log("\n🔐 OAuth2 Authentication failed. Possible issues:");
      console.log("• Refresh token is expired or invalid");
      console.log("• OAuth credentials don't match the email");
      console.log("• Gmail API not enabled in Google Cloud Console");
      console.log("• OAuth consent screen not properly configured");
    }
    
    console.log("\n💡 Solution: Regenerate your refresh token:");
    console.log("1. Go to: https://developers.google.com/oauthplayground");
    console.log("2. Use your same OAuth credentials");
    console.log("3. Select: https://mail.google.com/ scope");
    console.log("4. Generate new tokens");
    console.log("5. Update .env with new refresh token");
  }
}

testEmail();