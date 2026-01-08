// subscriptionController.js
const client = require("./paypalClient.cjs");
const checkout = require("@paypal/checkout-server-sdk");

async function createSubscription(req, res) {
  try {
    const { planType } = req.body;
    if (!planType) {
      return res.status(400).json({ error: "Missing planType" });
    }

    let planId;
    if (planType === "premium") planId = process.env.PAYPAL_PLAN_PREMIUM;
    else if (planType === "enterprise") planId = process.env.PAYPAL_PLAN_ENTERPRISE;
    else return res.status(400).json({ error: "Invalid plan type" });

    const request = new checkout.billing.subscriptions.SubscriptionCreateRequest();
    request.requestBody({
      plan_id: planId,
      application_context: {
        brand_name: "Lyric Flow",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.CLIENT_ORIGIN}/subscription-success`,
        cancel_url: `${process.env.CLIENT_ORIGIN}/subscription-cancel`,
      },
    });

    const response = await client().execute(request);

    const approveUrl = response.result.links.find((l) => l.rel === "approve")?.href;
    if (!approveUrl) {
      return res.status(500).json({ error: "PayPal subscription created but approval link missing" });
    }

    return res.json({ url: approveUrl, subscriptionId: response.result.id });
  } catch (err) {
    console.error("PayPal subscription error:", err);
    return res.status(500).json({ error: "PayPal subscription failed", details: err.message });
  }
}

module.exports = { createSubscription };
