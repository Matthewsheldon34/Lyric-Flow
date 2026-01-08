io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a project room
  socket.on("joinProject", (projectId) => {
    socket.join(projectId);
    console.log(`User joined project ${projectId}`);
  });

  // Handle live cursor updates
  socket.on("updateCursor", ({ projectId, userId, cursorPos }) => {
    socket.to(projectId).emit("cursorUpdate", { userId, cursorPos });
  });

  // Handle notifications
  socket.on("notifyUpdate", ({ projectId, message }) => {
    socket.to(projectId).emit("notification", { message });
  });

  // Handle live lyric variations
  socket.on("liveVariations", ({ projectId, lyricIndex, text, userId, selectionStart, selectionEnd }) => {
    socket.to(projectId).emit("liveVariationsUpdate", { lyricIndex, text, userId, selectionStart, selectionEnd });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
