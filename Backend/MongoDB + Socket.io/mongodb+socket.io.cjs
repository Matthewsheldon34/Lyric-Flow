/* eslint-env node */
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();

// ---------------- MongoDB Setup ----------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// ---------------- User Schema ----------------
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,

  // PLAN SYSTEM
  plan: { type: String, enum: ["free", "premium", "enterprise"], default: "free" },

  // DAILY LIMIT TRACKING
  lyricGenerationsToday: { type: Number, default: 0 },
  lastGeneratedDate: { type: Date, default: null }
});

const User = mongoose.model("User", UserSchema);

// ---------------- Project Schema ----------------
const ProjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Link to user
  name: String,
  lyrics: [String],
  stats: {
    lyricCount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
});

const Project = mongoose.model("Project", ProjectSchema);

// ---------------- Express Setup ----------------
const app = express();
app.use(bodyParser.json());

// ---------------- Save Lyric Route ----------------
app.post("/save-lyric/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { lyric } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    project.lyrics.push(lyric);
    project.stats.lyricCount = project.lyrics.length;
    project.stats.lastUpdated = new Date();

    await project.save();
    res.json(project);

  } catch (err) {
    console.error("Error saving lyric:", err);
    res.status(500).json({ error: "Failed to save lyric", details: err.message });
  }
});

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>  console.log(`🚀 Server running on port ${PORT}`));
