const User = require("../server.cjs").User;
const planFeatures = require("../config/planFeatures.js");

module.exports = async function checkLyricLimit(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - no user session" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Ensure fields exist
    if (!user.subscription) user.subscription = { plan: "free" };
    if (!user.dailyUsage) user.dailyUsage = { count: 0, lastReset: new Date() };

    const plan = user.subscription.plan || "free";
    const features = planFeatures[plan];

    // Reset usage at midnight
    const today = new Date().toDateString();
    const lastReset = new Date(user.dailyUsage.lastReset).toDateString();
    if (today !== lastReset) {
      user.dailyUsage.count = 0;
      user.dailyUsage.lastReset = new Date();
      await user.save();
    }

    // Enforce limit
    if (isFinite(features.dailyLimit) && user.dailyUsage.count >= features.dailyLimit) {
      return res.status(403).json({
        error: "DAILY_LIMIT_REACHED",
        message: "Daily lyric limit reached. Upgrade to continue.",
      });
    }

    // Increment usage
    if (isFinite(features.dailyLimit)) {
      user.dailyUsage.count += 1;
      await user.save();
    }

    req.planFeatures = features;
    req.dailyUsage = { count: user.dailyUsage.count, dailyLimit: features.dailyLimit };

    next();

  } catch (err) {
    console.error("checkLyricLimit Error:", err);
    res.status(500).json({ error: "Internal server error while checking usage limit" });
  }
};
