// server.cjs — Lyric Flow Backend (Complete with OTP & All Features)

require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// FIXED: Update these imports to use correct paths
// Since server.cjs is in Backend/, and these files are in root/routes/ and root/config/
const subscriptionRouter = require("./routes/subscriptionEndpoint.cjs");
const PLAN_FEATURES = require("./config/planFeatures.js");

// ----------------------- ENV VALIDATION -----------------------
const requiredEnvs = [
  "MONGO_URI","JWT_SECRET","SESSION_SECRET","GOOGLE_CLIENT_ID",
  "GOOGLE_API_KEY","PAYPAL_CLIENT_ID","PAYPAL_SECRET",
  "PAYPAL_PLAN_PREMIUM","PAYPAL_PLAN_ENTERPRISE","PAYPAL_MODE",
  "GEMINI_API_KEY","GEMINI_MODEL","CLIENT_ORIGIN","EMAIL_USER",
  "APP_PASSWORD","EMAIL_HOST","EMAIL_PORT"
];
for (const env of requiredEnvs) {
  if (!process.env[env]) {
    console.error(`❌ Missing environment variable: ${env}`);
    process.exit(1);
  }
}

// ----------------------- DATABASE -----------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => { console.error("❌ MongoDB error:", err); process.exit(1); });

// ----------------------- SCHEMAS -----------------------
// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: String,
  profilePic: String,
  isAdmin: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false }, // Require OTP verification

  subscription: {
    plan: { type: String, enum: ["free","premium","enterprise"], default:"free" },
    status: { type: String, enum: ["active","canceled"], default:"active" },
    renewalDate: Date,
    paypalSubscriptionId: String
  },

  dailyUsage: {
    count: { type: Number, default:0 },
    lastReset: { type: Date, default: new Date() }
  },

  otp: String,
  otpExpires: Date
});
const User = mongoose.model("User", UserSchema);

// Contact Message Schema
const ContactMessageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true },
  message:  { type: String, required: true },
  createdAt:{ type: Date, default: Date.now }
});
const ContactMessage = mongoose.model("ContactMessage", ContactMessageSchema);

// Project Schema
const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  theme: String,
  idea: String,
  style: { type: String, default: "Pop" },
  mood: { type: String, default: "Happy" },
  lyrics: [String],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Project = mongoose.model("Project", ProjectSchema);

// ----------------------- EXPRESS + SERVER -----------------------
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",       // Local development
  "https://lyricflow.it.com"     // Production frontend
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
      return callback(new Error(msg), false);
    }

    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ----------------------- AUTH MIDDLEWARE -----------------------
function authMiddleware(req,res,next){
  const header = req.headers.authorization;
  if(!header) return res.status(401).json({error:"No token"});
  const [type,token] = header.split(" ");
  if(type!=="Bearer" || !token) return res.status(401).json({error:"Invalid token format"});
  try { req.user = jwt.verify(token,process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({error:"Invalid or expired token"}); }
}

// ======================= ROUTES =======================

// ----------------------- ROOT & HEALTH ROUTES -----------------------
app.get("/", (req, res) => {
  res.json({
    message: "🎵 Lyric Flow Backend API",
    status: "running",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/register",
        verify: "POST /api/verify-otp",
        login: "POST /api/login",
        profile: "GET /api/user/profile",
        google: "POST /api/oauth/google"
      },
      projects: {
        list: "GET /api/projects",
        create: "POST /api/project",
        update: "PUT /api/project/:id",
        delete: "DELETE /api/project/:id"
      },
      lyrics: "POST /api/generate-lyrics",
      contact: "POST /api/contact",
      dailyUsage: "GET /api/user/daily-usage",
      paypal: "GET /api/paypal/*",
      health: "GET /health",
      adminReset: "DELETE /admin/reset-all-users"
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// ----------------------- TEST ROUTE -----------------------
app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "✅ Backend is working!",
    server: "Lyric Flow API",
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || "development"
  });
});

// ----------------------- SMTP SETUP -----------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.APP_PASSWORD
  }
});

transporter.verify()
  .then(() => console.log("✅ SMTP connection verified - OTP emails will work!"))
  .catch(err => {
    console.error("❌ SMTP connection failed:", err.message);
    console.log("🔧 Troubleshooting:");
    console.log("1. Check EMAIL_USER and APP_PASSWORD in .env");
    console.log("2. Make sure 2FA is enabled on Gmail");
    console.log("3. Verify App Password is correct (16 chars, no spaces)");
    console.log("4. Try: https://accounts.google.com/DisplayUnlockCaptcha");
  });

// ----------------------- OTP EMAIL FUNCTION -----------------------
async function sendOtpEmail(email, otp) {
  try {
    console.log(`📧 Sending OTP to: ${email}`);
    
    const mailOptions = {
      from: `"Lyric Flow" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Verification Code - Lyric Flow",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; background: linear-gradient(135deg, #7C3AED, #4F46E5); padding: 30px; border-radius: 10px; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🎵 Lyric Flow</h1>
            <p style="font-size: 18px; opacity: 0.9;">Your AI Songwriting Partner</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h2 style="color: #1e293b; margin-bottom: 10px;">Verify Your Email</h2>
            <p style="color: #64748b; font-size: 16px;">Enter this verification code to complete your registration:</p>
            
            <div style="background: white; padding: 25px; border-radius: 12px; border: 2px dashed #7C3AED; margin: 25px 0;">
              <div style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #7C3AED; text-align: center;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #ef4444; font-size: 14px; font-weight: bold;">
              ⚠️ This code will expire in 10 minutes
            </p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #64748b; font-size: 12px;">
              If you didn't request this code, please ignore this email.<br>
              For security reasons, do not share this code with anyone.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to: ${email}`);
    return true;
    
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error.message);
    console.log(`🎯 OTP FALLBACK for ${email}: ${otp}`);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}

// ----------------------- ADMIN ROUTES -----------------------
app.delete("/admin/reset-all-users", async (req, res) => {
  try {
    const result = await User.deleteMany({});
    console.log(`🗑️  COMPLETELY RESET: Deleted ${result.deletedCount} users`);
    res.json({ 
      success: true,
      message: "All users deleted successfully. Fresh start!",
      deletedCount: result.deletedCount 
    });
  } catch (err) { 
    console.error("Reset users error:", err); 
    res.status(500).json({error:"Failed to reset users"}); 
  }
});

// ----------------------- AUTH ROUTES -----------------------
app.post("/api/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    console.log("📝 Registration attempt:", { email, username });
    
    if (!email || !username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUsername = await User.findOne({ 
      username: new RegExp(`^${username}$`, 'i') 
    });
    if (existingUsername) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    const user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashed,
      subscription: { plan: "free" },
      isVerified: false,
      otp,
      otpExpires
    });

    console.log(`👤 New user created: ${email} (pending verification)`);

    await sendOtpEmail(email, otp);

    res.json({ 
      success: true,
      message: "Registration successful! Check your email for verification code.",
      needsVerification: true,
      userId: user._id
    });

  } catch (err) { 
    console.error("Registration error:", err); 
    
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.username) {
        return res.status(400).json({ error: "Username already taken" });
      }
      if (err.keyPattern && err.keyPattern.email) {
        return res.status(400).json({ error: "Email already registered" });
      }
    }
    
    res.status(500).json({ error: "Registration failed. Please try again." }); 
  }
});

app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(400).json({ error: "User not found. Please register again." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email already verified. Please login." });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ error: "No OTP found. Please request a new one." });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }

    if (user.otp !== otp) {
      console.log(`❌ Invalid OTP attempt for ${email}: ${otp} (expected: ${user.otp})`);
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log(`✅ User verified: ${email}`);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Email verified successfully!",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePic: user.profilePic,
        plan: user.subscription.plan,
        isVerified: true
      }
    });

  } catch (err) { 
    console.error("OTP verification error:", err); 
    res.status(500).json({ error: "OTP verification failed" }); 
  }
});

app.post("/api/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOtpEmail(email, otp);

    res.json({
      success: true,
      message: "New verification code sent to your email!"
    });

  } catch (err) { 
    console.error("Resend OTP error:", err); 
    res.status(500).json({ error: "Failed to resend OTP" }); 
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.isVerified) {
      console.log(`❌ Login blocked: ${email} not verified`);
      return res.status(401).json({ 
        error: "Please verify your email first. Check your email for the verification code.",
        needsVerification: true 
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    console.log(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePic: user.profilePic,
        plan: user.subscription.plan,
        isVerified: true
      }
    });

  } catch (err) { 
    console.error("Login error:", err); 
    res.status(500).json({ error: "Login failed" }); 
  }
});
// ----------------------- FORGOT PASSWORD ROUTES -----------------------
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // For security, don't reveal if email exists or not
      console.log(`🔐 Password reset requested for non-existent email: ${email}`);
      return res.json({ 
        success: true,
        message: "If an account exists with this email, a reset code will be sent."
      });
    }

    // Generate reset OTP (6 digits)
    const resetOtp = crypto.randomInt(100000, 999999).toString();
    const resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store OTP in user document
    user.otp = resetOtp;
    user.otpExpires = resetOtpExpires;
    await user.save();

    console.log(`🔑 Password reset OTP for ${email}: ${resetOtp}`);

    // Send reset email
    try {
      await transporter.sendMail({
        from: `"Lyric Flow" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Password Reset Request - Lyric Flow",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; background: linear-gradient(135deg, #7C3AED, #4F46E5); padding: 30px; border-radius: 10px; color: white;">
              <h1 style="margin: 0; font-size: 28px;">🎵 Lyric Flow</h1>
              <p style="font-size: 18px; opacity: 0.9;">Your AI Songwriting Partner</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h2 style="color: #1e293b; margin-bottom: 10px;">Reset Your Password</h2>
              <p style="color: #64748b; font-size: 16px;">Use this verification code to reset your password:</p>
              
              <div style="background: white; padding: 25px; border-radius: 12px; border: 2px dashed #7C3AED; margin: 25px 0;">
                <div style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #7C3AED; text-align: center;">
                  ${resetOtp}
                </div>
              </div>
              
              <p style="color: #ef4444; font-size: 14px; font-weight: bold;">
                ⚠️ This code will expire in 15 minutes
              </p>
              
              <p style="color: #64748b; font-size: 14px;">
                If you didn't request a password reset, please ignore this email.
                Your account is safe and no changes have been made.
              </p>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              <p style="color: #64748b; font-size: 12px;">
                For security reasons, do not share this code with anyone.<br>
                This is an automated message, please do not reply.
              </p>
            </div>
          </div>
        `
      });
      
      console.log(`✅ Password reset email sent to: ${email}`);
      
      res.json({ 
        success: true,
        message: "Password reset instructions sent to your email.",
        email: email // Send back the email for next step
      });
      
    } catch (emailError) {
      console.error("❌ Failed to send reset email:", emailError.message);
      
      // Still return success but log the OTP for debugging
      console.log(`🔧 EMAIL FALLBACK - Reset OTP for ${email}: ${resetOtp}`);
      
      res.json({ 
        success: true,
        message: "Reset code generated. Check console for OTP (email service issue).",
        otp: process.env.NODE_ENV === 'development' ? resetOtp : undefined,
        email: email
      });
    }

  } catch (err) { 
    console.error("Forgot password error:", err); 
    res.status(500).json({ error: "Failed to process password reset request" }); 
  }
});

app.post("/api/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ error: "No reset request found. Please request a new code." });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ error: "Reset code expired. Please request a new one." });
    }

    if (user.otp !== otp) {
      console.log(`❌ Invalid reset OTP attempt for ${email}: ${otp} (expected: ${user.otp})`);
      return res.status(400).json({ error: "Invalid reset code" });
    }

    console.log(`✅ Reset OTP verified for: ${email}`);

    res.json({
      success: true,
      message: "Reset code verified successfully. You can now set a new password.",
      email: email,
      otp: otp // Send back OTP for the next step
    });

  } catch (err) { 
    console.error("Verify reset OTP error:", err); 
    res.status(500).json({ error: "Failed to verify reset code" }); 
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ error: "No reset request found. Please start over." });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ error: "Reset session expired. Please request a new code." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ error: "Invalid reset code" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password and clear OTP fields
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log(`✅ Password reset successful for: ${email}`);

    // Generate login token for automatic login
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Password reset successful! You are now logged in.",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePic: user.profilePic,
        plan: user.subscription.plan,
        isVerified: true
      }
    });

  } catch (err) { 
    console.error("Reset password error:", err); 
    res.status(500).json({ error: "Failed to reset password" }); 
  }
});
// ----------------------- PROJECT ROUTES -----------------------
app.get("/api/projects", authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error("Get projects error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.post("/api/project", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const project = await Project.create({
      name,
      userId: req.user.id
    });

    res.json(project);
  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

app.put("/api/project/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, theme, idea, style, mood, lyrics } = req.body;

    const project = await Project.findOne({ _id: id, userId: req.user.id });
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (name !== undefined) project.name = name;
    if (theme !== undefined) project.theme = theme;
    if (idea !== undefined) project.idea = idea;
    if (style !== undefined) project.style = style;
    if (mood !== undefined) project.mood = mood;
    if (lyrics !== undefined) project.lyrics = lyrics;
    
    project.updatedAt = new Date();

    await project.save();

    res.json(project);
  } catch (err) {
    console.error("Update project error:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

app.delete("/api/project/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findOneAndDelete({ _id: id, userId: req.user.id });
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// ----------------------- USER ROUTES -----------------------
app.get("/api/user", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
      subscription: user.subscription,
      isVerified: user.isVerified
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

app.get("/api/user/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePic: user.profilePic,
        plan: user.subscription.plan,
        isVerified: user.isVerified,
        dailyUsage: user.dailyUsage
      }
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// ----------------------- CONTACT FORM -----------------------
app.post("/api/contact", async (req, res) => {
  try {
    const { username, email, message } = req.body;
    
    if (!username || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const contact = await ContactMessage.create({ username, email, message });

    await transporter.sendMail({
      from: `"Lyric Flow Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `New Contact Message from ${username}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h3>New Contact Form Submission</h3>
          <p><strong>Name:</strong> ${username}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 5px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
      `
    });

    console.log(`📧 Contact form submitted by: ${email}`);

    res.json({ 
      success: true,
      message: "Thank you! Your message has been received.", 
      contactId: contact._id 
    });

  } catch (err) { 
    console.error("Contact form error:", err); 
    res.status(500).json({ error: "Failed to send message" }); 
  }
});

// ----------------------- DAILY USAGE LIMIT MIDDLEWARE -----------------------
async function checkLyricLimit(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.dailyUsage) user.dailyUsage = { count: 0, lastReset: new Date() };

    const today = new Date().toDateString();
    const lastReset = new Date(user.dailyUsage.lastReset).toDateString();

    if (today !== lastReset) {
      user.dailyUsage.count = 0;
      user.dailyUsage.lastReset = new Date();
      await user.save();
    }

    const plan = user.subscription?.plan || "free";
    const dailyLimit = PLAN_FEATURES[plan]?.dailyLimit ?? 5;

    if (isFinite(dailyLimit) && user.dailyUsage.count >= dailyLimit) {
      return res.status(403).json({
        error: "DAILY_LIMIT_REACHED",
        message: "Daily lyric limit reached.",
        count: user.dailyUsage.count,
        dailyLimit,
      });
    }

    if (isFinite(dailyLimit)) {
      user.dailyUsage.count += 1;
      await user.save();
    }

    req.userData = user;
    req.dailyUsage = { count: user.dailyUsage.count, dailyLimit };
    next();
  } catch (err) {
    console.error("checkLyricLimit Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ----------------------- DAILY USAGE ENDPOINT -----------------------
app.get("/api/user/daily-usage", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.dailyUsage) user.dailyUsage = { count: 0, lastReset: new Date() };

    const today = new Date().toDateString();
    const lastReset = new Date(user.dailyUsage.lastReset).toDateString();

    if (today !== lastReset) {
      user.dailyUsage.count = 0;
      user.dailyUsage.lastReset = new Date();
      await user.save();
    }

    const plan = user.subscription?.plan || "free";
    const dailyLimit = PLAN_FEATURES[plan]?.dailyLimit ?? 5;

    res.json({ count: user.dailyUsage.count, dailyLimit });
  } catch (err) {
    console.error("daily-usage error:", err);
    res.status(500).json({ error: "Failed to fetch daily usage" });
  }
});

// ----------------------- GEMINI LYRICS GENERATION -----------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/generate-lyrics", authMiddleware, checkLyricLimit, async (req, res) => {
  try {
    const { theme, style, mood, promptType, startingLine } = req.body;

    if (!theme) {
      return res.status(400).json({ error: "Theme is required" });
    }

    console.log(`🎵 Generating lyrics for theme: ${theme}`);

    const prompt = `
You are an expert AI songwriter and lyricist. Generate original, creative, and emotionally engaging lyrics.

THEME: ${theme}
STYLE: ${style || "contemporary"}
MOOD: ${mood || "inspirational"}
PROMPT TYPE: ${promptType || "full song"}
STARTING LINE: ${startingLine || "None - create original lyrics"}

INSTRUCTIONS:
- Create complete, structured lyrics with verses, chorus, and bridge
- Make the lyrics emotionally resonant and memorable
- Use appropriate rhyme schemes and poetic devices
- Ensure the lyrics match the specified theme, style, and mood
- Make it original and creative, not generic

FORMAT:
Please format the lyrics with clear section labels like [Verse 1], [Chorus], [Verse 2], etc.
`;

    const availableModels = [
      "models/gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];

    let lastError = null;

    for (const modelName of availableModels) {
      try {
        console.log(`🤖 Attempting to use model: ${modelName}`);
        
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text() || "";

        if (!text) {
          throw new Error("No response from AI model");
        }

        console.log(`✅ Lyrics generated successfully with ${modelName}`);
        console.log(`📝 Response length: ${text.length} characters`);

        const formatted = text
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => line.replace(/^\*\*|\*\*$/g, '').replace(/^###\s*/, ''));

        return res.json({
          success: true,
          lyrics: formatted,
          dailyCount: req.dailyUsage.count,
          dailyLimit: req.dailyUsage.dailyLimit,
          modelUsed: modelName
        });

      } catch (modelError) {
        console.log(`❌ Model ${modelName} failed: ${modelError.message}`);
        lastError = modelError;
        continue;
      }
    }

    console.error("❌ All Gemini models failed:", lastError);
    throw new Error("AI service temporarily unavailable. Please try again later.");

  } catch (err) {
    console.error("Lyrics Generation Error:", err.message);
    
    res.status(500).json({ 
      error: "Failed to generate lyrics. Please try again later.",
      details: err.message
    });
  }
});

// ----------------------- GOOGLE OAUTH -----------------------
app.post("/api/oauth/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "ID token required" });

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    
    if (!user) {
      user = await User.create({
        email,
        username: name.replace(/\s+/g, "").toLowerCase(),
        profilePic: picture,
        subscription: { plan: "free" },
        isVerified: true
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePic: user.profilePic,
        plan: user.subscription.plan,
        isVerified: true
      }
    });

  } catch (err) { 
    console.error("Google login error:", err); 
    res.status(500).json({ error: "Google login failed" }); 
  }
});

// ----------------------- PAYPAL ROUTES -----------------------
app.use("/api/paypal", authMiddleware, subscriptionRouter);

// ----------------------- SOCKET.IO -----------------------
io.on("connection", socket => {
  console.log("⚡ User connected:", socket.id);
  socket.on("liveEdit", data => socket.broadcast.emit("liveEditUpdate", data));
  socket.on("disconnect", () => console.log("🔌 User disconnected:", socket.id));
});

// ----------------------- START SERVER -----------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  // Always show the Render URL (we know it's deployed there)
  const renderUrl = "https://lyric-flow.onrender.com";
  const isProduction = process.env.NODE_ENV === 'production';
  
  const baseUrl = isProduction ? renderUrl : `http://localhost:${PORT}`;
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${isProduction ? 'Production (Render)' : 'Development'}`);
  console.log(`🔗 URL: ${baseUrl}`);
  console.log(`🩺 ${baseUrl}/health`);
  console.log(`🧪 ${baseUrl}/test`);
  console.log(`🔧 OTP Verification: Enabled`);
});

module.exports = { app, server, User, authMiddleware };
