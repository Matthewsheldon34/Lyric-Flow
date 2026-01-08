import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function PremiumProject({ project, token, onUpdate, onSaveLyric, onDelete }) {
  const [lyricsText, setLyricsText] = useState(project.lyrics?.join("\n\n") || "");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(project.theme || "");
  const [idea, setIdea] = useState(project.idea || "");
  const [style, setStyle] = useState(project.style || "Pop");
  const [mood, setMood] = useState(project.mood || "Happy");
  const textareaRef = useRef(null);

  const genres = ["Pop", "HipHop", "Country", "Christian", "Rock", "Jazz", "RnB", "Afrobeat"];
  const moods = ["Happy", "Sad", "Romantic", "Energetic", "Chill"];

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const value = e.target.value;
    setLyricsText(value);
    onUpdate("lyrics", value.split("\n\n").filter(Boolean));
  };

  const handleGenerateLyrics = async () => {
    if (!theme.trim() && !idea.trim()) return alert("Please enter a theme or idea first.");
    setLoading(true);

    try {
      const promptText = idea ? `${theme} - ${idea}` : theme;
      const startingLine = lyricsText.split("\n\n")[0] || "";

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE || "https://lyric-flow.onrender.com"}/api/generate-lyrics`,
        { theme: promptText, style, mood, startingLine },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const generatedLyrics = Array.isArray(res.data.lyrics)
        ? res.data.lyrics
        : typeof res.data.lyrics === "string"
        ? res.data.lyrics.split(/\n+/).filter(Boolean)
        : ["No lyrics generated. Try again."];

      const combinedText = generatedLyrics.join("\n\n");
      setLyricsText(combinedText);
      onUpdate("lyrics", generatedLyrics);

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

  const handleDownload = () => {
    if (!lyricsText.trim()) return alert("No lyrics to download.");
    const blob = new Blob([lyricsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name || "lyrics"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Sync props ----------
  useEffect(() => {
    setTheme(project.theme || "");
    setIdea(project.idea || "");
    setStyle(project.style || "Pop");
    setMood(project.mood || "Happy");
    setLyricsText(project.lyrics?.join("\n\n") || "");
  }, [project]);

  return (
    <div className="p-4 bg-white/10 rounded-lg border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold">{project.name}</h3>
        <button onClick={onDelete} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded">
          Delete
        </button>
      </div>

      <div className="mb-3">
        <label className="text-white mr-2">Theme:</label>
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white w-full"
        />
      </div>

      <div className="mb-3">
        <label className="text-white mr-2">Idea:</label>
        <input
          type="text"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white w-full"
        />
      </div>

      <div className="mb-3 flex gap-2">
        <select value={style} onChange={(e) => setStyle(e.target.value)} className="p-2 rounded bg-gray-800 text-white">
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={mood} onChange={(e) => setMood(e.target.value)} className="p-2 rounded bg-gray-800 text-white">
          {moods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
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
          value={lyricsText}
          onChange={handleChange}
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded">Save</button>
        <button onClick={handleDownload} className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded">Download</button>
      </div>
    </div>
  );
}
