/* eslint-env browser */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion as Motion } from "framer-motion";
import { io } from "socket.io-client";
import axios from "axios";

import Project from "./Project";
import ProjectsSidebar from "./Projects Sidebar";
import Subscription from "./Subscription";
import Login from "./Login";
import MusicBackground from "./MusicBackground";
import ContactFormModal from "./ContactForm";

const API_BASE = "https://lyric-flow.onrender.com/api";

export default function App() {
  const [currentUser, setCurrentUser] = useState("");
  const [userProjects, setUserProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const socketRef = useRef(null);

  // Sync token to localStorage
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  // Fetch projects from backend
  const fetchProjects = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const projectsData = res.data || [];
      setUserProjects(projectsData);
      
      // Only select first project if no project is currently selected
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0]);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, [token]); // Removed selectedProject from dependencies to prevent loops

  // Fetch user info
  const fetchUserInfo = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await axios.get(`${API_BASE}/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentPlan(res.data.subscription?.plan || "free");
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  }, [token]);

  // Load data when token changes
  useEffect(() => {
    if (token) {
      fetchProjects();
      fetchUserInfo();
    } else {
      setUserProjects([]);
      setSelectedProject(null);
    }
  }, [token, fetchProjects, fetchUserInfo]);

  // Handle saving a project to backend
  const handleSaveProject = async (projectData) => {
    try {
      const res = await axios.put(
        `${API_BASE}/project/${projectData.id}`,
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

      const updatedProject = res.data;

      // Update the project in the projects list
      setUserProjects(prevProjects => 
        prevProjects.map(p => 
          p._id === projectData.id ? { ...p, ...updatedProject } : p
        )
      );
      
      // Also update the selected project if it's the one being saved
      if (selectedProject && selectedProject._id === projectData.id) {
        setSelectedProject(updatedProject);
      }
      
      alert(`✅ Project "${projectData.name}" saved successfully!`);
      return updatedProject;
    } catch (err) {
      console.error("❌ Error saving project:", err);
      alert("Failed to save project.");
      throw err;
    }
  };

  // Handle project updates
  const handleProjectUpdate = useCallback((projectId, field, value) => {
    setUserProjects(prevProjects =>
      prevProjects.map(p =>
        p._id === projectId ? { ...p, [field]: value } : p
      )
    );
    
    // Also update selected project if it's the one being edited
    if (selectedProject && selectedProject._id === projectId) {
      setSelectedProject(prev => ({ ...prev, [field]: value }));
    }
  }, [selectedProject]);

  // Handle deleting a project from backend
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    
    try {
      await axios.delete(`${API_BASE}/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedProjects = userProjects.filter(p => p._id !== projectId);
      setUserProjects(updatedProjects);
      
      // If deleted project was selected, select another one or clear selection
      if (selectedProject && selectedProject._id === projectId) {
        setSelectedProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
      }
    } catch (err) {
      console.error("❌ Error deleting project:", err);
      alert("Failed to delete project.");
    }
  };

  // Create new project via backend - FIXED
  const handleNewProject = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/project`,
        { name: "New Song Project" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newProject = res.data;
      
      // Update projects list and immediately select the new project
      setUserProjects(prev => [...prev, newProject]);
      setSelectedProject(newProject);
      
      return newProject;
    } catch (err) {
      console.error("Error creating project:", err);
      alert("Failed to create project. Try again.");
      throw err;
    }
  };

  // Select project from sidebar - FIXED
  const handleProjectSelect = (project) => {
    // Ensure we're using the same project reference from the userProjects array
    const projectFromList = userProjects.find(p => p._id === project._id) || project;
    setSelectedProject(projectFromList);
  };

  // Logout
  const handleLogout = () => {
    setCurrentUser("");
    setUserProjects([]);
    setSelectedProject(null);
    setToken("");
    setCurrentPlan("free");
  };

  // Upgrade plan
  const handleUpgrade = async (planType) => {
    if (!token) return alert("You must be logged in to upgrade.");
    try {
      const res = await axios.post(
        `${API_BASE}/paypal/create-subscription`,
        { plan: planType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.approveLink) {
        setCurrentPlan(planType);
        window.location.href = res.data.approveLink;
      } else {
        alert("Unable to start PayPal session.");
      }
    } catch (err) {
      console.error("Upgrade failed:", err);
      alert("Upgrade failed. Try again.");
    }
  };

  // Socket IO for live edits
  useEffect(() => {
  socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
  });

  socketRef.current.on("connect", () =>
    console.log("Connected:", socketRef.current.id)
  );

  socketRef.current.on("liveEditUpdate", ({ projectId, lyricsText }) => {
    handleProjectUpdate(projectId, "lyrics", lyricsText.split("\n"));
  });

  return () => socketRef.current?.disconnect();
}, [handleProjectUpdate]);


  // Generate lyrics
  const handleGenerateLyrics = async (projectId) => {
    const project = userProjects.find((p) => p._id === projectId);
    if (!project || (!project.theme?.trim() && !project.idea?.trim())) {
      return alert("Please enter a theme and/or idea first.");
    }

    try {
      // Update project loading state
      setUserProjects(prev =>
        prev.map(p => p._id === projectId ? { ...p, loading: true } : p)
      );

      const res = await axios.post(
        `${API_BASE}/api/generate-lyrics`,
        {
          theme: project.theme,
          style: project.style,
          mood: project.mood,
          startingLine: project.startingLine || "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const lyricsArray = Array.isArray(res.data.lyrics)
        ? res.data.lyrics
        : typeof res.data.lyrics === "string"
        ? res.data.lyrics.split(/\n+/).filter((line) => line.trim())
        : ["No lyrics generated."];

      // Update project with generated lyrics
      setUserProjects(prev =>
        prev.map(p =>
          p._id === projectId
            ? { 
                ...p, 
                lyrics: lyricsArray, 
                loading: false,
                generatedLyrics: lyricsArray 
              }
            : p
        )
      );

      // Update selected project if it's the current one
      if (selectedProject && selectedProject._id === projectId) {
        setSelectedProject(prev => ({
          ...prev,
          lyrics: lyricsArray,
          loading: false,
          generatedLyrics: lyricsArray
        }));
      }
    } catch (err) {
      console.error("Error generating lyrics:", err);
      setUserProjects(prev =>
        prev.map(p => p._id === projectId ? { ...p, loading: false } : p)
      );
      alert("Error generating lyrics.");
    }
  };

  // Login screen
  if (!token) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <MusicBackground />
        <Motion.div className="fixed inset-0 bg-linear-to-r from-blue-500 via-purple-600 to-pink-500 blur-3xl opacity-70 -z-20" />
        <Motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl p-10 border border-white/20 w-96"
        >
          <h1 className="text-4xl font-bold text-white mb-4">🎧 Lyric-Flow</h1>
          <Login setToken={setToken} setCurrentUser={setCurrentUser} />
        </Motion.div>
      </div>
    );
  }

  // Subscription screen
  if (showSubscription) {
    return (
      <Subscription
        currentPlan={currentPlan}
        onUpgrade={handleUpgrade}
        onBack={() => setShowSubscription(false)}
        token={token}
        setToken={setToken}
      />
    );
  }

  // Dashboard with Sidebar Layout
  return (
    <div className="relative min-h-screen">
      <MusicBackground />
      <Motion.div className="fixed inset-0 bg-linear-to-r from-blue-500 via-purple-600 to-pink-500 blur-3xl opacity-70 -z-20" />
      
      <div className="flex h-screen">
        {/* Projects Sidebar */}
        <ProjectsSidebar
          projects={userProjects}
          onProjectSelect={handleProjectSelect}
          selectedProjectId={selectedProject?._id}
          onNewProject={handleNewProject}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-purple-600 backdrop-blur-md p-4 border-b border-white/20">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">🎶 Lyric-Flow</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSubscription(true)}
                  className="bg-purple-800 px-4 py-2 rounded-lg text-white hover:bg-indigo-700 transition"
                >
                  Upgrade ({currentPlan})
                </button>
                <button
                  onClick={() => setIsContactOpen(true)}
                  className="bg-purple-800 px-4 py-2 rounded-lg text-white hover:bg-purple-700 transition"
                >
                  Contact / Feedback
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-purple-800  px-4 py-2 rounded-lg text-white hover:bg-purple-900  transition"
                >
                  Logout
                </button>


              </div>
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="text-white text-center py-8">Loading projects...</div>
            ) : selectedProject ? (
              <Motion.div
                key={selectedProject._id} // Add key to force re-render when project changes
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto backdrop-blur-xl bg-white/10 p-6 rounded-2xl border border-white/20 shadow-2xl"
              >
                <Project
                  project={selectedProject}
                  token={token}
                  socket={socketRef.current}
                  currentUser={currentUser}
                  currentPlan={currentPlan}
                  onUpdate={(field, value) => handleProjectUpdate(selectedProject._id, field, value)}
                  onSaveProject={handleSaveProject}
                  onDelete={() => handleDeleteProject(selectedProject._id)}
                  onShowSubscription={() => setShowSubscription(true)}
                />
              </Motion.div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center text-white backdrop-blur-xl bg-white/10 p-8 rounded-2xl border border-white/20"
                >
                  <h3 className="text-2xl mb-4">Welcome to Lyric-Flow!</h3>
                  <p className="text-gray-300 mb-6">
                    Select a project from the sidebar or create a new one to get started
                  </p>
                  <button
                    onClick={handleNewProject}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded text-lg transition-colors"
                  >
                    Create Your First Project
                  </button>
                </Motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}