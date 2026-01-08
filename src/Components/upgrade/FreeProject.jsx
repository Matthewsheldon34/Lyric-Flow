import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function FreeProject({ project, token, currentUser, onUpdate, onSaveLyric, onDelete, setShowSubscription }) {
  const [lyricsText, setLyricsText] = useState(project.lyrics?.join("\n\n") || "");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(project.theme || "");
  const [idea, setIdea] = useState(project.idea || "");
  const textareaRef = useRef(null);

  const basicThemes = ["Love", "Friendship", "Party", "Motivation"]; // Free plan themes

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const value = e.target.value;
    setLyricsText(value);
    onUpdate("lyrics", value.split("\n\n").filter(Boolean));
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
    onUpdate("theme", e.target.value);
  };

  const handleIdeaChange = (e) => {
    setIdea(e.target.value);
    onUpdate("idea", e.target.value);
  };

  const handleGenerateLyrics = async () => {
    if (!theme.trim() && !idea.trim()) return alert("Please enter a theme or idea first.");

    // ---------- Free Plan Daily Limit ----------
    const countKey = `${currentUser}-dailyCount`;
    const lastResetKey = `${currentUser}-lastReset`;
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem(lastResetKey);

    if (lastReset !== today) {
      localStorage.setItem(lastResetKey, today);
      localStorage.setItem(countKey, "0");
    }

    let count = parseInt(localStorage.getItem(countKey) || "0", 10);
    if (count >= 5) {
      alert("🎤 You've reached your free daily limit.\nUpgrade to continue generating lyrics.");
      setShowSubscription(true);
      return;
    }

    setLoading(true);
    try {
      const promptText = idea ? `${theme} - ${idea}` : theme;
      const startingLine = lyricsText.split("\n\n")[0] || "";

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE || "https://lyric-flow.onrender.com"}/api/generate-lyrics`,
        { theme: promptText, style: "Pop", mood: "Happy", startingLine },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const generatedLyrics = Array.isArray(res.data.lyrics)
        ? res.data.lyrics
        : typeof res.data.lyrics === "string"
        ? res.data.lyrics.split(/\n+/).filter((line) => line.trim())
        : ["No lyrics generated. Try again."];

      const combinedText = generatedLyrics.join("\n\n");
      setLyricsText(combinedText);
      onUpdate("lyrics", generatedLyrics);

      localStorage.setItem(countKey, (count + 1).toString());
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to generate lyrics.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!lyricsText.trim()) return alert("Cannot save empty lyrics.");
    onSaveLyric(lyricsText);
  };

  return (
    <div className="p-4 bg-white/10 rounded-lg border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold">{project.name}</h3>
        <button onClick={onDelete} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded">
          Delete
        </button>
      </div>

      <div className="mb-3">
        <label className="text-white mr-2">Theme (Free Only):</label>
        <select value={theme} onChange={handleThemeChange} className="p-2 rounded bg-gray-800 text-white w-full">
          <option value="">Select Theme</option>
          {basicThemes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <label className="text-white mr-2">Idea / Description:</label>
        <input
          type="text"
          value={idea}
          onChange={handleIdeaChange}
          placeholder="Enter an idea..."
          className="p-2 rounded bg-gray-800 text-white w-full"
        />
      </div>

      <div className="mb-3">
        <button
          onClick={handleGenerateLyrics}
          disabled={loading}
          className={`px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? "Generating..." : "Generate Lyrics"}
        </button>
      </div>

      <div className="mb-3">
        <textarea
          ref={textareaRef}
          rows={12}
          className="w-full p-3 rounded bg-white/10 text-white border border-white/20"
          placeholder="Generated lyrics will appear here..."
          value={lyricsText}
          onChange={handleChange}
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded">
          Save
        </button>
        <button
          disabled
          className="px-3 py-1 bg-gray-500 text-white rounded opacity-50 cursor-not-allowed"
        >
          Download Disabled
        </button>
      </div>
    </div>
  );
}
