// src/Components/backend.jsx
import { io } from "socket.io-client";

// ---------------- Initialize Socket.IO ----------------
const socket = io("https://lyric-flow.onrender.com", {
  transports: ["websocket", "polling"],
  reconnection: true,
});

// --- Connection logs ---
socket.on("connect", () => console.log("✅ Connected to Socket.IO:", socket.id));
socket.on("disconnect", () => console.log("❌ Disconnected from Socket.IO"));
socket.on("connect_error", (err) => console.error("⚠️ Socket error:", err.message));

/**
 * Join a project room for real-time collaboration.
 * @param {string} projectId - The project ID to join.
 * @param {function} onLiveEditUpdate - Callback for live lyric edits.
 * @param {function} onVariationsUpdate - Callback for live variations updates.
 */
export function joinProjectRoom(projectId, onLiveEditUpdate, onVariationsUpdate) {
  if (!projectId) return console.warn("⚠️ No projectId provided to joinProjectRoom");

  socket.emit("joinProject", projectId);
  console.log(`📁 Joined project room: ${projectId}`);

  // Clean previous listeners to avoid duplicates
  socket.off("liveEditUpdate");
  socket.off("liveVariationsUpdate");

  // Listen for live lyric edits
  socket.on("liveEditUpdate", (payload) => {
    if (typeof onLiveEditUpdate === "function") onLiveEditUpdate(payload);
  });

  // Listen for live variations updates
  socket.on("liveVariationsUpdate", (payload) => {
    if (typeof onVariationsUpdate === "function") onVariationsUpdate(payload);
  });
}

/**
 * Send a live edit event to the server.
 * @param {string} projectId
 * @param {number} lyricIndex
 * @param {string} text
 * @param {number} selectionStart
 * @param {number} selectionEnd
 */
export function sendLiveEdit(projectId, lyricIndex, text, selectionStart, selectionEnd) {
  if (!projectId) return console.warn("⚠️ No projectId provided to sendLiveEdit");

  socket.emit("liveEdit", {
    projectId,
    lyricIndex,
    text,
    selectionStart,
    selectionEnd,
  });
}

/**
 * Send updated lyric variations to collaborators.
 * @param {string} projectId
 * @param {number} lyricIndex
 * @param {string[]} variations
 */
export function sendLiveVariationsUpdate(projectId, lyricIndex, variations) {
  if (!projectId) return console.warn("⚠️ No projectId provided to sendLiveVariationsUpdate");

  socket.emit("liveVariationsUpdate", {
    projectId,
    lyricIndex,
    variations,
  });
}

/**
 * Leave a project room and remove listeners.
 * @param {string} projectId
 */
export function leaveProjectRoom(projectId) {
  if (!projectId) return;

  socket.emit("leaveProject", projectId);
  socket.off("liveEditUpdate");
  socket.off("liveVariationsUpdate");

  console.log(`📁 Left project room: ${projectId}`);
}

/**
 * Disconnect the socket completely.
 */
export function disconnectSocket() {
  socket.disconnect();
  console.log("❌ Socket disconnected manually");
}
