import React, { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";

export default function ContactFormModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({ username: "", email: "", message: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [sending, setSending] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL;

  // Auto-close on success after 2 seconds
  useEffect(() => {
    if (status.type === "success") {
      const timer = setTimeout(() => {
        onClose();
        // Reset form after closing
        setTimeout(() => {
          setFormData({ username: "", email: "", message: "" });
          setStatus({ type: "", message: "" });
        }, 300);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status.type, onClose]);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSending(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: data.message || "Message sent successfully! ✅" });
        setFormData({ username: "", email: "", message: "" });
      } else {
        setStatus({ type: "error", message: data.error || "Something went wrong. Please try again." });
      }
    } catch (err) {
      console.error("Contact form error:", err);
      setStatus({ type: "error", message: "Failed to send message. Please check your connection." });
    }

    setSending(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Motion.div
            className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-6 max-w-md w-full relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 font-bold text-xl"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
              Contact / Feedback
            </h2>

            {status.message && (
              <div
                className={`mb-4 p-3 text-center rounded-lg ${
                  status.type === "success"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}
              >
                {status.message}
                {status.type === "success" && (
                  <div className="text-sm mt-1 opacity-75">Closing automatically...</div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Your Name"
                required
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Your Email"
                required
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Your message or feedback..."
                required
                rows={5}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <button
                type="submit"
                disabled={sending}
                className={`bg-purple-600 text-white font-semibold px-4 py-2 rounded-lg transition ${
                  sending ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-700"
                }`}
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
              
            </form>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}