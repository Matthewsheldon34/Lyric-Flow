import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { PLAN_FEATURES } from "../../Backend/config/planFeatures.js";

export default function Project({
  project,
  token,
  currentUser,
  currentPlan = "free",
  onUpdate,
  onSaveProject,
  onDelete,
  onShowSubscription,
}) {
  const [lyricsText, setLyricsText] = useState(project.lyrics?.join("\n\n") || "");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(project.theme || "");
  const [idea, setIdea] = useState(project.idea || "");
  const [style, setStyle] = useState(project.style || "Pop");
  const [mood, setMood] = useState(project.mood || "Happy");
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(null);
  const [projectName, setProjectName] = useState(project.name || "Untitled Project");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  const genres = ["Pop", "HipHop", "Country", "Christian", "Rock", "Jazz", "RnB", "Afrobeat"];
  const moods = ["Happy", "Sad", "Romantic", "Energetic", "Chill"];
  const prompts = ["Starting Line", "Chorus", "Verse", "Bridge"];

  const API_BASE = import.meta.env.VITE_API_URL || "https://lyric-flow.onrender.com/api";



  // Add this debug useEffect at the top of your Project component
useEffect(() => {
  console.log("🔍 DEBUG Project Object:", {
    project: project,
    has_id: !!project._id,
    _id: project._id,
    has_id_property: !!project.id,
    id: project.id,
    projectKeys: Object.keys(project)
  });
}, [project]);
  // ---------------- Fetch daily usage from backend ----------------
  useEffect(() => {
    if (!currentUser || !token) return;

    async function fetchDailyUsage() {
      try {
        const res = await axios.get(`${API_BASE}/api/user/daily-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const count = res.data.count ?? 0;
        let limit = res.data.dailyLimit ?? PLAN_FEATURES[currentPlan]?.dailyLimit ?? null;

        setDailyCount(count);
        setDailyLimit(limit);
      } catch (err) {
        console.error("Failed to fetch daily usage:", err.response?.data || err);
        setDailyLimit(PLAN_FEATURES[currentPlan]?.dailyLimit ?? null);
      }
    }

    fetchDailyUsage();
  }, [currentUser, token, currentPlan]);

  // ---------------- Handlers ----------------
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

  const handleStyleChange = (e) => {
    setStyle(e.target.value);
    onUpdate("style", e.target.value);
  };

  const handleMoodChange = (e) => {
    setMood(e.target.value);
    onUpdate("mood", e.target.value);
  };

  const handleProjectNameChange = (e) => {
    setProjectName(e.target.value);
    onUpdate("name", e.target.value);
  };

  const insertPrompt = (prompt) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const insertText = `${prompt}: `;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = lyricsText.slice(0, start) + insertText + lyricsText.slice(end);
    setLyricsText(newText);
    onUpdate("lyrics", newText.split("\n\n").filter(Boolean));

    const cursorPos = start + insertText.length;
    setTimeout(() => textarea.setSelectionRange(cursorPos, cursorPos), 0);
    textarea.focus();
  };

  // ---------------- Generate Lyrics ----------------
  const handleGenerateLyrics = async () => {
    if (!theme.trim() && !idea.trim()) return alert("Please enter a theme and/or idea first.");

    if (dailyLimit !== null && dailyCount >= dailyLimit) {
      alert(
        `🎤 You've reached your daily limit of ${dailyLimit} generations.\nUpgrade to continue generating lyrics.`
      );
      onShowSubscription?.();
      return;
    }

    setLoading(true);

    try {
      const startingLine = lyricsText.split("\n\n")[0] || "";
      const promptText = idea ? `${theme} - ${idea}` : theme;

      const res = await axios.post(
        `${API_BASE}/generate-lyrics`,
        { theme: promptText, style, mood, startingLine },
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

      // Update daily usage from backend response if available
      if (res.data.dailyCount !== undefined) {
        setDailyCount(res.data.dailyCount);
        setDailyLimit(res.data.dailyLimit ?? PLAN_FEATURES[currentPlan]?.dailyLimit ?? null);
      }
    } catch (err) {
      console.error("Error generating lyrics:", err.response?.data || err);
      alert(err.response?.data?.message || "Failed to generate lyrics.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Save Project (Fixed Version) ----------------
  const handleSaveProject = async () => {
    if (!lyricsText.trim() && !theme.trim() && !idea.trim()) {
      return alert("Please add some content before saving.");
    }

    setSaving(true);

    try {
      // ✅ FIX: Use the actual project._id from MongoDB
      const projectId = project._id;
      
      if (!projectId) {
        alert("Project ID not found. Please refresh and try again.");
        return;
      }

      const projectData = {
        name: projectName,
        theme: theme,
        idea: idea,
        style: style,
        mood: mood,
        lyrics: lyricsText.split("\n\n").filter(Boolean),
      };

      console.log("🔄 Saving project:", { projectId, projectData });

      // If onSaveProject is provided, use it. Otherwise save directly.
      if (onSaveProject && typeof onSaveProject === 'function') {
        console.log("📤 Using onSaveProject from parent");
        await onSaveProject({
          id: projectId, // ✅ Pass the correct MongoDB _id
          ...projectData
        });
      } else {
        // Fallback: Save directly to backend
        console.log("📤 Saving directly to backend");
        const res = await axios.put(
          `${API_BASE}/api/project/${projectId}`,
          projectData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("✅ Project saved directly:", res.data);
      }

      alert(`✅ Project "${projectName}" saved successfully!`);
    } catch (err) {
      console.error("❌ Save project error:", err.response?.data || err);
      console.error("❌ Full error:", err);
      alert(err.response?.data?.error || "Failed to save project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadLyrics = () => {
    if (!lyricsText.trim()) return alert("No lyrics to download.");

    const blob = new Blob([lyricsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName || "lyrics"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------------- Debug: Check what props are being passed ----------------
  useEffect(() => {
    console.log("🔍 Project Component Props:", {
      projectId: project._id,
      projectName: project.name,
      hasOnSaveProject: typeof onSaveProject === 'function',
      hasOnUpdate: typeof onUpdate === 'function',
      hasOnDelete: typeof onDelete === 'function',
      project: project // Log the full project object
    });
  }, [project, onSaveProject, onUpdate, onDelete]);

  // ---------------- Sync props ----------------
  useEffect(() => {
    setProjectName(project.name || "Untitled Project");
    setTheme(project.theme || "");
    setIdea(project.idea || "");
    setStyle(project.style || "Pop");
    setMood(project.mood || "Happy");
    setLyricsText(project.lyrics?.join("\n\n") || "");
  }, [project]);

  return (
    <div className="p-4 bg-white/10 rounded-lg border border-white/20">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          value={projectName}
          onChange={handleProjectNameChange}
          className="p-1 bg-transparent text-white font-bold text-lg border-b border-white/30 w-64"
          placeholder="Project name..."
        />
        <button
          onClick={onDelete}
          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
        >
          Delete
        </button>
      </div>

      {/* Inputs */}
      <div className="mb-3">
        <label className="text-white mr-2">Theme:</label>
        <input
          type="text"
          value={theme}
          onChange={handleThemeChange}
          placeholder="Enter a theme..."
          className="p-2 rounded bg-gray-800 text-white border border-gray-600 w-full"
        />
      </div>

      <div className="mb-3">
        <label className="text-white mr-2">Idea / Description:</label>
        <input
          type="text"
          value={idea}
          onChange={handleIdeaChange}
          placeholder="Enter an idea or description..."
          className="p-2 rounded bg-gray-800 text-white border border-gray-600 w-full"
        />
      </div>

      <div className="mb-3">
        <label className="text-white mr-2">Genre:</label>
        <select
          value={style}
          onChange={handleStyleChange}
          className="p-2 rounded bg-gray-800 text-white border border-gray-600 w-full"
        >
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="text-white mr-2">Mood:</label>
        <select
          value={mood}
          onChange={handleMoodChange}
          className="p-2 rounded bg-gray-800 text-white border border-gray-600 w-full"
        >
          {moods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Prompt Buttons */}
      <div className="mb-3 flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => insertPrompt(p)}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Generate Lyrics Button */}
      <div className="mb-3">
        <button
          onClick={handleGenerateLyrics}
          disabled={loading || (dailyLimit !== null && dailyCount >= dailyLimit)}
          className={`px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading
            ? "Generating..."
            : dailyLimit !== null
            ? `Generate Lyrics (${Math.max(dailyLimit - dailyCount, 0)} left)`
            : "Generate Lyrics"}
        </button>
      </div>

      {/* Lyrics Textarea */}
      <div className="mb-3">
        <textarea
          ref={textareaRef}
          rows={12}
          className="w-full p-3 rounded bg-white/10 text-white border border-white/20 resize-y overflow-y-auto whitespace-pre-wrap leading-relaxed"
          placeholder="Generated lyrics will appear here..."
          value={lyricsText}
          onChange={handleChange}
        />
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            onClick={handleSaveProject}
            disabled={saving}
            className={`px-3 py-1 ${
              saving ? "bg-gray-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
            } text-white rounded`}
          >
            {saving ? "Saving..." : "Save Project"}
          </button>
          <button
            onClick={handleDownloadLyrics}
            className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded"
          >
            Download Lyrics
          </button>
        </div>
      </div>
    </div>
  );
}