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
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStep, setResetStep] = useState(1); // 1: request reset, 2: enter OTP, 3: new password
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

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

  // ------------------ Handle Google Login ------------------
  const handleGoogleLogin = async (credentialResponse) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.post(`${API_BASE}/api/oauth/google`, {
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

  // ------------------ Handle Forgot Password ------------------
  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");

    if (!resetEmail) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/forgot-password`, { email: resetEmail });
      setSuccess("Password reset instructions sent to your email");
      setResetStep(2);
    } catch (err) {
      console.error("Forgot password error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleResetOtp = async () => {
    if (!resetOtp) {
      setError("Please enter the OTP");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/verify-reset-otp`, { email: resetEmail, otp: resetOtp });
      setSuccess("OTP verified. Please enter your new password");
      setResetStep(3);
    } catch (err) {
      console.error("Reset OTP error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      setError("Please fill in both password fields");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/reset-password`, {
        email: resetEmail,
        otp: resetOtp,
        newPassword,
      });

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        setToken(res.data.token);
        setSuccess("Password reset successful! You are now logged in.");
        setForgotPassword(false);
        setResetStep(1);
        setResetEmail("");
        setResetOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setSuccess("Password reset successful! Please login with your new password.");
        setForgotPassword(false);
        setResetStep(1);
        setResetEmail("");
        setResetOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (err) {
      console.error("Reset password error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Render Forgot Password Form ------------------
  const renderForgotPassword = () => {
    if (!forgotPassword) return null;

    return (
      <div style={{ marginTop: "1rem", padding: "1rem", background: "#2a2a2a", borderRadius: "6px" }}>
        <h3>Reset Password</h3>
        
        {resetStep === 1 && (
          <>
            <p style={{ fontSize: "0.9rem", marginBottom: "1rem", color: "#ccc" }}>
              Enter your email to receive a reset code
            </p>
            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", marginBottom: "10px" }}
            />
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              style={{
                padding: "10px",
                backgroundColor: loading ? "#555" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                width: "100%"
              }}
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </>
        )}

        {resetStep === 2 && (
          <>
            <p style={{ fontSize: "0.9rem", marginBottom: "1rem", color: "#ccc" }}>
              Enter the OTP sent to your email
            </p>
            <input
              type="text"
              placeholder="Enter OTP"
              value={resetOtp}
              onChange={(e) => setResetOtp(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", marginBottom: "10px" }}
            />
            <button
              onClick={handleResetOtp}
              disabled={loading}
              style={{
                padding: "10px",
                backgroundColor: loading ? "#555" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                width: "100%"
              }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        {resetStep === 3 && (
          <>
            <p style={{ fontSize: "0.9rem", marginBottom: "1rem", color: "#ccc" }}>
              Enter your new password
            </p>
            <div style={{ position: "relative", marginBottom: "10px" }}>
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%" }}
              />
              <span
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#ccc" }}
              >
                {showNewPassword ? "🙈" : "👁️"}
              </span>
            </div>
            
            <div style={{ position: "relative", marginBottom: "10px" }}>
              <input
                type={showConfirmNewPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%" }}
              />
              <span
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#ccc" }}
              >
                {showConfirmNewPassword ? "🙈" : "👁️"}
              </span>
            </div>
            
            <button
              onClick={handleResetPassword}
              disabled={loading}
              style={{
                padding: "10px",
                backgroundColor: loading ? "#555" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                width: "100%"
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}

        <button
          onClick={() => {
            setForgotPassword(false);
            setResetStep(1);
            setResetEmail("");
            setResetOtp("");
            setNewPassword("");
            setConfirmNewPassword("");
            setError("");
            setSuccess("");
          }}
          style={{
            marginTop: "10px",
            background: "none",
            border: "none",
            color: "#ff6b6b",
            cursor: "pointer",
            textDecoration: "underline",
            fontSize: "0.9rem"
          }}
        >
          Cancel
        </button>
      </div>
    );
  };

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div style={{
        maxWidth: "400px", margin: "2rem auto", textAlign: "center",
        color: "white", background: "#1e1e1e", padding: "2rem",
        borderRadius: "10px", boxShadow: "0 0 10px rgba(255,255,255,0.1)"
      }}>
        <h2>{forgotPassword ? "Reset Password" : (signup ? "Sign Up" : "Login")}</h2>

        {!forgotPassword && !otpStep ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "1rem" }}>
            {signup && (
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />

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

            {signup && (
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

            {error && <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>}
            {success && <p style={{ color: "limegreen", fontSize: "0.9rem" }}>{success}</p>}

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

            <div style={{ margin: "10px 0" }}>
              <GoogleLogin onSuccess={handleGoogleLogin} onError={() => setError("Google login failed")} />
            </div>

            <div style={{ display: "grid", justifyContent: "center", alignItems: "center" }}>
              <button
                onClick={() => { setSignUp(prev => !prev); setError(""); setSuccess(""); }}
                style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", textDecoration: "underline" }}
              >
                {signup ? "Already have an account? Login" : "First time? Sign up"}
              </button>
              <button
                onClick={() => { setForgotPassword(true); setError(""); setSuccess(""); }}
                style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", textDecoration: "underline", fontSize: "0.9rem" }}
              >
                Forgot Password?
              </button>
            </div>
          </div>
        ) : otpStep ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "1rem" }}>
            <p style={{ fontSize: "0.9rem", color: "#ccc" }}>Enter the OTP sent to {email}</p>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
            {error && <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>}
            {success && <p style={{ color: "limegreen", fontSize: "0.9rem" }}>{success}</p>}
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
          </div>
        ) : null}

        {renderForgotPassword()}

        <footer style={{ marginTop: "2rem" }}>
          <a 
            href="https://lyricflow-terms.ink" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: "#ccc", fontSize: "0.8rem", textDecoration: "none" }}
          >
            Privacy Policy
          </a>
        </footer>
      </div>
    </GoogleOAuthProvider>
  );
}
