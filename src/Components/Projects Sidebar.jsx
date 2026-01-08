import React from "react";
import { motion as Motion } from "framer-motion";

export default function ProjectsSidebar({ 
  projects, 
  onProjectSelect, 
  selectedProjectId,
  onNewProject 
}) {
  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const getLyricsCount = (project) => {
    if (!project.lyrics) return 0;
    return Array.isArray(project.lyrics) ? project.lyrics.length : 0;
  };

  // Helper function to get project ID (supports both _id and id)
  const getProjectId = (project) => {
    return project._id || project.id;
  };

  return (
    <div className="w-80 h-screen border-r border-white/20">
      {/* Background overlay matching App.jsx */}
      <div className="fixed inset-0 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 blur-3xl opacity-70 -z-10 w-80" />
      
      {/* Sidebar content with glass morphism effect */}
      <Motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="h-full backdrop-blur-xl bg-white/10 p-4 overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">My Projects</h2>
          <button
            onClick={onNewProject}
            className="px-4 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded text-sm transition-colors backdrop-blur-sm border border-white/20"
          >
            + New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-white text-center py-8 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
            <div className="text-4xl mb-2">🎵</div>
            <p className="text-lg mb-1">No projects yet</p>
            <p className="text-gray-300">Create your first project to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(project => {
              const projectId = getProjectId(project);
              const isSelected = selectedProjectId === projectId;
              
              return (
                <Motion.div
                  key={projectId}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onProjectSelect(project)}
                  className={`p-3 rounded-xl cursor-pointer border-2 transition-all duration-200 backdrop-blur-sm ${
                    isSelected
                      ? "bg-blue-500/30 border-blue-400/60 shadow-lg shadow-blue-500/20"
                      : "bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-semibold text-white truncate flex-1 mr-2">
                      {project.name || "Untitled Project"}
                    </div>
                    <div className="text-xs text-white bg-black/20 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                      {getLyricsCount(project)} sections
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-200 truncate mb-2">
                    {project.theme ? `Theme: ${project.theme}` : "No theme set"}
                  </div>
                  
                  {project.idea && (
                    <div className="text-xs text-gray-300 mb-2 line-clamp-2 backdrop-blur-sm bg-black/10 p-1 rounded">
                      {project.idea}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-gray-300">
                    <span>Updated: {formatDate(project.updatedAt)}</span>
                    <div className="flex items-center gap-2">
                      {project.style && (
                        <span className="bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded text-xs backdrop-blur-sm border border-purple-400/30">
                          {project.style}
                        </span>
                      )}
                      {project.mood && project.mood !== "Happy" && (
                        <span className="bg-pink-500/30 text-pink-200 px-1.5 py-0.5 rounded text-xs backdrop-blur-sm border border-pink-400/30">
                          {project.mood}
                        </span>
                      )}
                    </div>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        )}

        {/* Projects counter */}
        {projects.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="text-sm text-gray-300 text-center backdrop-blur-sm bg-white/5 py-2 rounded-lg border border-white/10">
              {projects.length} project{projects.length !== 1 ? 's' : ''} total
            </div>
          </div>
        )}
      </Motion.div>
    </div>
  );
}