// src/Components/Login.jsx
import React, { useState } from "react";
import axios from "axios";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";

export default function Login({ setToken }) {
  const [signup, setSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState(""); // OTP input
  const [otpStep, setOtpStep] = useState(false); // show OTP field after signup

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL;
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // ------------------ Handle Signup / Login ------------------
  const handleAuth = async () => {
    setError("");
    setSuccess("");

    // validations
    if (!email || !password || (signup && !username) || (signup && !confirmPassword)) {
      setError("Please fill in all required fields");
      return;
    }
    if (signup && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const endpoint = signup ? `${API_BASE}/api/register` : `${API_BASE}/api/login`;
      const payload = signup
        ? { email, username: username.toLowerCase(), password }
        : { email, password };

      const res = await axios.post(endpoint, payload);

      if (signup) {
        // After signup, expect OTP step
        setOtpStep(true);
        setSuccess("OTP sent to your email. Enter it below to verify.");
      } else {
        if (!res.data.token) throw new Error("No token returned");
        localStorage.setItem("token", res.data.token);
        setToken(res.data.token);
        setSuccess("Login successful!");
      }
    } catch (err) {
      console.error("Auth error:", err.response?.data || err.message);
      setError(err.response?.data?.error || (signup ? "Signup failed" : "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Verify OTP ------------------
  const handleVerifyOtp = async () => {
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/api/verify-otp`, { email, otp });
      if (!res.data.token) throw new Error("No token returned");

      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      setSuccess("Email verified! You are now logged in.");
      setOtpStep(false);
      setSignUp(false);
    } catch (err) {
      console.error("OTP verify error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };
const handleGoogleLogin = async (credentialResponse) => {
  setLoading(true);
  setError("");
  setSuccess("");

  try {
    const res = await axios.post(`${API_BASE}/oauth/google`, {
      idToken: credentialResponse.credential,
    });

    if (!res.data.token) throw new Error("No token returned");

    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setSuccess("Google login successful!");
  } catch (err) {
    console.error("Google login error:", err.response?.data || err.message);
    setError("Google login failed. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div style={{
        maxWidth: "400px", margin: "2rem auto", textAlign: "center",
        color: "white", background: "#1e1e1e", padding: "2rem",
        borderRadius: "10px", boxShadow: "0 0 10px rgba(255,255,255,0.1)"
      }}>
        <h2>{signup ? "Sign Up" : "Login"}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "1rem" }}>

          {signup && !otpStep && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
          )}

          {!otpStep && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
          )}

          {!otpStep && (
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%" }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#ccc" }}
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
          )}

          {signup && !otpStep && (
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%" }}
              />
              <span
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#ccc" }}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </span>
            </div>
          )}

          {otpStep && (
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
          )}

          {error && <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>}
          {success && <p style={{ color: "limegreen", fontSize: "0.9rem" }}>{success}</p>}

          {!otpStep ? (
            <button
              onClick={handleAuth}
              disabled={loading}
              style={{
                padding: "10px",
                backgroundColor: loading ? "#555" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "0.2s"
              }}
            >
              {loading ? (signup ? "Signing up..." : "Logging in...") : (signup ? "Sign Up" : "Login")}
            </button>
          ) : (
            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              style={{
                padding: "10px",
                backgroundColor: loading ? "#555" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "0.2s"
              }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          )}

          <div style={{ margin: "10px 0" }}>
            {!otpStep && <GoogleLogin onSuccess={handleGoogleLogin} onError={() => setError("Google login failed")} />}
          </div>

          {!otpStep && (
            <button
              onClick={() => { setSignUp(prev => !prev); setError(""); setSuccess(""); }}
              style={{ marginTop: "10px", background: "none", border: "none", color: "#007bff", cursor: "pointer", textDecoration: "underline" }}
            >
              {signup ? "Already have an account? Login" : "First time? Sign up"}
            </button>
          )}
          <footer>
  <a href="https://lyricflow-terms.ink" target="_blank">
    Privacy Policy
  </a>
</footer>

        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
