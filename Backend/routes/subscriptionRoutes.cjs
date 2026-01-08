// routes/subscriptionEndpoint.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.cjs"); // Auth middleware
const paypal = require("@paypal/checkout-server-sdk");
const User = require("../server.cjs").User; // Make sure you export User from server
const planFeatures = require("../config/planFeatures");

// ------------------ PayPal Client ------------------
const PAYPAL_ENV =
  process.env.PAYPAL_MODE === "live"
    ? new paypal.core.LiveEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      )
    : new paypal.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      );

const payPalClient = new paypal.core.PayPalHttpClient(PAYPAL_ENV);

// ------------------ Create Subscription ------------------
async function createSubscription(req, res) {
  try {
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ error: "Plan type required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    let planId;
    if (plan === "premium") planId = process.env.PAYPAL_PLAN_PREMIUM;
    else if (plan === "enterprise") planId = process.env.PAYPAL_PLAN_ENTERPRISE;
    else return res.status(400).json({ error: "Invalid plan type" });

    // Create PayPal subscription request
    const request = new paypal.subscriptions.SubscriptionsCreateRequest();
    request.requestBody({
      plan_id: planId,
      application_context: {
        brand_name: "Lyric Flow",
        locale: "en-US",
        return_url: `${process.env.CLIENT_ORIGIN}/subscription-success`,
        cancel_url: `${process.env.CLIENT_ORIGIN}/subscription-cancel`,
      },
    });

    const response = await payPalClient.execute(request);

    // Save subscription info to user
    user.subscription.plan = plan;
    user.subscription.paypalSubscriptionId = response.result.id;
    user.subscription.status = "active";
    await user.save();

    res.json({
      approveLink: response.result.links.find((l) => l.rel === "approve")?.href,
      subscriptionId: response.result.id,
    });
  } catch (err) {
    console.error("PayPal subscription error:", err);
    res.status(500).json({ error: "Failed to create PayPal subscription" });
  }
}

// ------------------ Export Router ------------------
router.post("/create-subscription", auth, createSubscription);

module.exports = router;
