import React, { useState, useEffect } from "react";
import Project from "./Project";
import ProjectsSidebar from "./ProjectsSidebar";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentUser] = useState(/* your user object */);
  const [token] = useState(localStorage.getItem("token"));
  const [currentPlan] = useState("free");

  // Load projects from localStorage on component mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('savedProjects');
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      setProjects(parsedProjects);
      
      // Select the first project if available
      if (parsedProjects.length > 0 && !selectedProject) {
        setSelectedProject(parsedProjects[0]);
      }
    }
  }, []);

  // Save projects to localStorage whenever projects change
  useEffect(() => {
    localStorage.setItem('savedProjects', JSON.stringify(projects));
  }, [projects]);

  // Handle saving a project (add new or update existing)
  const handleSaveProject = (projectData) => {
    setProjects(prevProjects => {
      const existingIndex = prevProjects.findIndex(p => p.id === projectData.id);
      
      if (existingIndex >= 0) {
        // Update existing project
        const updated = [...prevProjects];
        updated[existingIndex] = projectData;
        return updated;
      } else {
        // Add new project
        return [...prevProjects, projectData];
      }
    });
    
    // Switch to the saved project
    setSelectedProject(projectData);
  };

  // Handle project updates
  const handleProjectUpdate = (field, value) => {
    if (selectedProject) {
      const updatedProject = {
        ...selectedProject,
        [field]: value,
        updatedAt: new Date().toISOString()
      };
      setSelectedProject(updatedProject);
    }
  };

  // Handle deleting a project
  const handleDeleteProject = () => {
    if (selectedProject && confirm("Are you sure you want to delete this project?")) {
      setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
      setSelectedProject(projects.length > 1 ? projects[0] : null);
    }
  };

  // Create new project
  const handleNewProject = () => {
    const newProject = {
      id: Date.now().toString(),
      name: "New Song Project",
      theme: "",
      idea: "",
      style: "Pop",
      mood: "Happy",
      lyrics: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedProject(newProject);
  };

  // Select project from sidebar
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Projects Sidebar */}
      <ProjectsSidebar
        projects={projects}
        onProjectSelect={handleProjectSelect}
        selectedProjectId={selectedProject?.id}
        onNewProject={handleNewProject}
      />

      {/* Main Editor Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedProject ? (
          <Project
            project={selectedProject}
            token={token}
            currentUser={currentUser}
            currentPlan={currentPlan}
            onUpdate={handleProjectUpdate}
            onSaveProject={handleSaveProject}
            onDelete={handleDeleteProject}
            onShowSubscription={() => {/* your subscription modal */}}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <h3 className="text-2xl mb-4">Welcome to Lyric Writer!</h3>
              <p className="text-gray-400 mb-6">
                Select a project from the sidebar or create a new one to get started
              </p>
              <button
                onClick={handleNewProject}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded text-lg"
              >
                Create Your First Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}