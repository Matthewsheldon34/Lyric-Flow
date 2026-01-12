const axios = require("axios");
const { BASE_URL, getAccessToken } = require("./paypalClient.cjs");

/**
 * Create PayPal Subscription
 */
async function createSubscription(req, res) {
  try {
    const { planType } = req.body;
    if (!planType)
      return res.status(400).json({ error: "Plan type required" });

    // Map planType to PayPal plan ID
    let planId;
    if (planType === "premium") planId = process.env.PAYPAL_PLAN_PREMIUM;
    else if (planType === "enterprise") planId = process.env.PAYPAL_PLAN_ENTERPRISE;
    else return res.status(400).json({ error: "Invalid plan type" });

    const accessToken = await getAccessToken();

    const response = await axios.post(
      `${BASE_URL}/v1/billing/subscriptions`,
      {
        plan_id: planId,
        application_context: {
          brand_name: "Lyric Flow",
          return_url: `${process.env.CLIENT_ORIGIN}/subscription-success`,
          cancel_url: `${process.env.CLIENT_ORIGIN}/subscription-cancel`,
          user_action: "SUBSCRIBE_NOW",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const approveLink = response.data.links.find(
      (link) => link.rel === "approve"
    )?.href;

    res.json({ approveLink, subscriptionId: response.data.id });
  } catch (err) {
    console.error(
      "PayPal Create Subscription Error:",
      err.response?.data || err
    );
    res.status(500).json({ error: "Failed to create subscription" });
  }
}

module.exports = { createSubscription };
