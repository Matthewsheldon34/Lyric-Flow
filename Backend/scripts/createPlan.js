import axios from "axios";

// PayPal API Base (Sandbox)
const BASE_URL = "https://api-m.sandbox.paypal.com"; 

async function createPlan() {
  try {
    // Get access token
    const auth = Buffer.from(
      process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET
    ).toString("base64");

    const tokenRes = await axios.post(
      `${BASE_URL}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenRes.data.access_token;

    // Create Plan
    const response = await axios.post(
      `${BASE_URL}/v1/billing/plans`,
      {
        product_id: "PROD-3WH485305N228934Ce", // ✅ Your product
        name: "Lyric Flow Monthly Premium",
        description: "Premium features & unlimited recognition",
        billing_cycles: [
          {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: { value: "5.99", currency_code: "USD" }
            }
          }
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("\n✅ PLAN CREATED SUCCESSFULLY");
    console.log("PLAN ID:", response.data.id, "\n");
  } catch (err) {
    console.error("\n❌ Error creating plan\n", err.response?.data || err.message);
  }
}

createPlan();
