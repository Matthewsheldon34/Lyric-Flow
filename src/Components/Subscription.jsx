import React, { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { io } from "socket.io-client";
import { PLAN_FEATURES as planFeatures } from "../../Backend/config/planFeatures.js";




// ⬆ Adjust path if needed

export default function Subscription({ currentPlan = "free", onBack }) {
  const [loadingPlan, setLoadingPlan] = useState(null);

  // Build UI plan cards dynamically using planFeatures
  const plans = [
    {
      name: "Free",
      price: "0",
      type: "free",
      color: "from-gray-600 to-gray-800",
      features: [
        `${planFeatures.free.dailyLimit} lyric generations per day`,
        planFeatures.free.basicThemesOnly
          ? "Basic themes only"
          : "All themes",
        planFeatures.free.canExport
          ? "download lyrics"
          : "All styles & moods",
      ],
    },
    {
      name: "Premium",
      price: "9.99",
      type: "premium",
      color: "from-blue-600 to-indigo-500",
      features: [
        planFeatures.premium.dailyLimit
          ? "Limited lyric generations"
          : "Unlimited lyric generations",
        planFeatures.premium.basicThemesOnly
          ? "Basic themes only"
          : "All styles & moods",
        planFeatures.premium.canExport
          ? "Save & export lyrics"
          : "No export",
        planFeatures.premium.aiTools
          ? "AI song structure tool"
          : null,
      ].filter(Boolean),
    },
    {
      name: "Enterprise",
      price: "49.99",
      type: "enterprise",
      color: "from-purple-600 to-pink-500",
      features: [
        planFeatures.enterprise.teamCollab && "Team collaboration",
        planFeatures.enterprise.apiAccess && "API access",
        planFeatures.enterprise.priorityGeneration && "Priority generation speed",
        planFeatures.enterprise.support && "Dedicated support",
      ].filter(Boolean),
    },
  ];
const API_BASE = import.meta.env.VITE_API_URL || "https://lyric-flow.onrender.com/api";


  // Socket connection for paid plans
  useEffect(() => {
    if (currentPlan === "free") return;

    const socket = io(API_BASE, {
      auth: { token: localStorage.getItem("token") },
    });

    socket.on("connect", () =>
      console.log("⚡ Subscription socket connected")
    );
    socket.on("disconnect", () =>
      console.log("🔌 Subscription socket disconnected")
    );

    return () => socket.disconnect();
  }, [currentPlan, API_BASE]);

  const handleUpgrade = async (planType) => {
    if (!localStorage.getItem("token")) {
      alert("You must be logged in to upgrade.");
      return;
    }

    if (planType === currentPlan) return;

    try {
      setLoadingPlan(planType);

      const res = await fetch(`${API_BASE}/paypal/create-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ planType }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create subscription");
      if (!data.approveLink)
        throw new Error("No PayPal approval link received.");

      window.location.href = data.approveLink;
    } catch (err) {
      alert("Upgrade failed. Please try again.");
      console.error("Upgrade Error:", err);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-black text-white flex flex-col items-center p-10">
      <div className="w-full max-w-6xl flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <button
          onClick={onBack}
          className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 w-full max-w-6xl">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.type;
          const isLoading = loadingPlan === plan.type;

          return (
            <Motion.div
              key={plan.type}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={`bg-linear-to-br ${plan.color} rounded-2xl p-6 shadow-xl border border-white/20`}
            >
              <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
              <p className="text-4xl font-extrabold mb-4">
                ${plan.price}
                <span className="text-lg font-normal"> /month</span>
              </p>

              <ul className="text-white/80 mb-6 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i}>✅ {f}</li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.type)}
                disabled={isCurrent || isLoading}
                className={`w-full py-2 rounded-lg ${
                  isCurrent
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
              >
                {isCurrent
                  ? "Current Plan"
                  : isLoading
                  ? "Processing..."
                  : `Upgrade to ${plan.name}`}
              </button>
            </Motion.div>
          );
        })}
      </div>
    </div>
  );
}
