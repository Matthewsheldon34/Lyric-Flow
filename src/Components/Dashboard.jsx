// src/Components/Dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Subscription from "./Subscription";
import Project from "./Project";

export default function Dashboard({ token }) {
  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [showSubscription, setShowSubscription] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [currentUser, setCurrentUser] = useState(null);
  const socketRef = useRef(null);

  // ---------------- Initialize socket once ----------------
  useEffect(() => {
  if (!socketRef.current) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "https://lyric-flow.onrender.com";

    socketRef.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });

    socketRef.current.on("connect", () =>
      console.log("✅ Connected to Socket.IO server:", socketRef.current.id)
    );

    socketRef.current.on("connect_error", (err) =>
      console.error("❌ Socket connection error:", err.message)
    );

    socketRef.current.connect();
  }

  return () => {
    socketRef.current?.disconnect();
  };
}, []);


  // ---------------- Fetch user info + projects ----------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects
        const resProjects = await axios.get("https://lyric-flow.onrender.com/api/projects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProjects(resProjects.data || []);
        console.log("📋 Loaded projects:", resProjects.data);

        // Fetch user subscription info
        const resUser = await axios.get("https://lyric-flow.onrender.com/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentPlan(resUser.data.subscription?.plan || "free");
        setCurrentUser(resUser.data); // Set current user
        console.log("👤 Current user:", resUser.data);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
      }
    };

    if (token) fetchData();
  }, [token]);

  // ---------------- Create a new project ----------------
  const createProject = async () => {
    const name = newProjectName.trim();
    if (!name) return alert("Enter a project name.");

    try {
      const res = await axios.post(
        "https://lyric-flow.onrender.com/api/project",
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjects((prev) => [...prev, res.data]);
      setNewProjectName("");
      console.log("✅ Created new project:", res.data);
    } catch (err) {
      console.error("❌ Error creating project:", err);
      alert("Failed to create project. Try again.");
    }
  };

  // ---------------- Handle Project Save (FIXED) ----------------
  const handleSaveProject = async (projectData) => {
    try {
      console.log("🔄 Dashboard: Saving project", projectData);
      
      // ✅ FIX: Use projectData.id (which is the MongoDB _id passed from Project component)
      const projectId = projectData.id;

      if (!projectId) {
        alert("Project ID not found. Please refresh and try again.");
        return;
      }

      // Update project in backend
      const res = await axios.put(
        `https://lyric-flow.onrender.com/api/project/${projectId}`,
        {
          name: projectData.name,
          theme: projectData.theme,
          idea: projectData.idea,
          style: projectData.style,
          mood: projectData.mood,
          lyrics: projectData.lyrics
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Backend response:", res.data);

      // ✅ FIX: Update the project in the projects list - compare _id with projectData.id
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p._id === projectId ? { ...p, ...res.data } : p
        )
      );
      
      alert(`✅ Project "${projectData.name}" saved successfully!`);
    } catch (err) {
      console.error("❌ Error saving project:", err);
      console.error("❌ Error response:", err.response?.data);
      alert("Failed to save project. Please check console for details.");
    }
  };

  // ---------------- Handle Project Updates ----------------
  const handleProjectUpdate = (projectId, field, value) => {
    console.log("📝 Updating project:", { projectId, field, value });
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p._id === projectId ? { ...p, [field]: value, updatedAt: new Date().toISOString() } : p
      )
    );
  };

  // ---------------- Handle Project Delete ----------------
  const handleDeleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    try {
      await axios.delete(`https://lyric-flow.onrender.com/api/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(prev => prev.filter(p => p._id !== projectId));
      console.log("🗑️ Deleted project:", projectId);
    } catch (err) {
      console.error("❌ Error deleting project:", err);
      alert("Failed to delete project.");
    }
  };

  // ---------------- Handle Upgrade ----------------
  const handleUpgrade = async (plan) => {
    try {
      const res = await axios.post(
        "https://lyric-flow.onrender.com/api/upgrade",
        { plan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentPlan(res.data.subscription.plan);
      setShowSubscription(false);
      alert(`✅ Successfully upgraded to ${res.data.subscription.plan} plan!`);
    } catch (err) {
      console.error("❌ Upgrade failed:", err);
      alert("Upgrade failed. Please try again.");
    }
  };

  // ---------------- UI ----------------
  if (showSubscription) {
    return (
      <Subscription
        currentPlan={currentPlan}
        onUpgrade={handleUpgrade}
        onBack={() => setShowSubscription(false)}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">🎵 Lyric-Flow Dashboard</h2>
        <button
          onClick={() => setShowSubscription(true)}
          className="bg-indigo-500 px-4 py-2 rounded-lg hover:bg-indigo-600 transition"
        >
          Upgrade Plan
        </button>
      </div>

      {/* --- Create Project --- */}
      <div className="flex mb-6 gap-2">
        <input
          type="text"
          className="flex-1 p-2 border rounded bg-white/20 text-white placeholder-white/60"
          placeholder="New Project Name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={createProject}
        >
          Create Project
        </button>
      </div>

      {/* --- Project List --- */}
      <div className="space-y-6">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Project
              key={project._id}
              project={project}
              token={token}
              socket={socketRef.current}
              currentUser={currentUser}
              currentPlan={currentPlan}
              onUpdate={(field, value) => handleProjectUpdate(project._id, field, value)}
              onSaveProject={handleSaveProject}
              onDelete={() => handleDeleteProject(project._id)}
              onShowSubscription={() => setShowSubscription(true)}
            />
          ))
        ) : (
          <p className="text-gray-300 text-center">
            No projects yet. Create one above!
          </p>
        )}
      </div>
    </div>
  );
}