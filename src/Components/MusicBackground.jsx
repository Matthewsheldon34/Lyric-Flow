import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NOTES = ["🎵", "🎶", "♫", "♬", "♩", "♪"];

export default function MusicBackground() {
  const bars = new Array(35).fill(0);
  const audioRef = useRef(null);

  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);

  const [audioLevel, setAudioLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  // -----------------------------
  // INTRO LOADING SCREEN
  // -----------------------------
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // -----------------------------
  // SMOOTH MOUSE PARALLAX
  // -----------------------------
  const targetOffset = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const handleMove = (e) => {
      targetOffset.current = { x: e.clientX / 100, y: e.clientY / 100 };
    };
    window.addEventListener("mousemove", handleMove);

    const smoothMove = () => {
      setMouseOffset((prev) => ({
        x: prev.x + (targetOffset.current.x - prev.x) * 0.1,
        y: prev.y + (targetOffset.current.y - prev.y) * 0.1,
      }));
      requestAnimationFrame(smoothMove);
    };

    smoothMove();
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // -----------------------------
  // AUDIO CONTEXT + ANALYZER (once)
  // -----------------------------
  useEffect(() => {
    if (!audioRef.current) return;

    if (!audioContextRef.current) {
      const audio = audioRef.current;
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = context.createAnalyser();
      const source = context.createMediaElementSource(audio);

      source.connect(analyser);
      analyser.connect(context.destination);

      analyser.fftSize = 256;

      audioContextRef.current = context;
      sourceRef.current = source;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        setAudioLevel(avg / 150);
        requestAnimationFrame(updateLevel);
      };

      updateLevel();
    }
  }, []);

  // -----------------------------
  // PLAY / PAUSE
  // -----------------------------
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      audio.play().catch(() => console.log("Autoplay blocked"));
    } else {
      audio.pause();
    }
    setIsPlaying(!isPlaying);
  };

  // -----------------------------
  // FILE UPLOAD / DROP HANDLING
  // -----------------------------
  const handleFileChange = (file) => {
    if (file && file.type === "audio/mpeg") {
      const fileURL = URL.createObjectURL(file);
      setPlaylist((prev) => [...prev, fileURL]);
      if (playlist.length === 0) setCurrentIndex(0);
    }
  };

  const handleFileUpload = (e) => handleFileChange(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  // -----------------------------
  // LOADING SCREEN
  // -----------------------------
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white text-3xl z-50">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          🎧 Loading music…
        </motion.div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className="h-full"
    >
      {/* AUDIO SOURCE */}
      <audio
        ref={audioRef}
        preload="auto"
        loop={false}
        onEnded={() => {
          if (currentIndex + 1 < playlist.length) {
            setCurrentIndex(currentIndex + 1);
            setIsPlaying(true);
          } else {
            setIsPlaying(false);
          }
        }}
      >
        {playlist[currentIndex] && (
          <source
            key={playlist[currentIndex]} // forces reload when switching
            src={playlist[currentIndex]}
            type="audio/mpeg"
          />
        )}
        Your browser does not support audio.
      </audio>

      {/* BACKGROUND THEME */}
      <div
        className={`fixed inset-0 -z-30 transition-all duration-700 ${
          theme === "dark"
            ? "bg-black"
            : theme === "neon"
            ? "bg-purple-800"
            : "bg-gray-200"
        }`}
      ></div>

      {/* REACTIVE EQUALIZER */}
      <div className="fixed inset-0 -z-20 flex items-end justify-center pointer-events-none opacity-40">
        <div
          className="flex gap-1 w-full max-w-5xl justify-center"
          style={{
            transform: `translate(${mouseOffset.x}px, ${mouseOffset.y}px)`,
          }}
        >
          {bars.map((_, i) => (
            <motion.div
              key={`bar-${i}`}
              className="rounded-full shadow-lg"
              style={{
                width: "6px",
                background:
                  theme === "dark"
                    ? "white"
                    : theme === "neon"
                    ? "#00ffea"
                    : "black",
              }}
              animate={{
                height: `${20 + audioLevel * (40 + Math.random() * 120)}px`,
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </div>

      {/* FLOATING NOTES */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => {
          const note = NOTES[Math.floor(Math.random() * NOTES.length)];
          return (
            <motion.div
              key={`note-${i}`}
              className="text-3xl absolute drop-shadow-xl"
              style={{
                color: `hsl(${Math.random() * 360}, 100%, 70%)`,
              }}
              initial={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                rotate: 0,
              }}
              animate={{
                rotate: 360,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              transition={{
                duration: 6 + Math.random() * 6,
                repeat: Infinity,
                repeatType: "mirror",
              }}
            >
              {note}
            </motion.div>
          );
        })}
      </div>

      {/* VINYL CLICKABLE - Increased z-index */}
      <motion.div
        onClick={togglePlay}
        className="fixed bottom-10 right-10 w-32 h-32 rounded-full bg-gray-300 shadow-2xl cursor-pointer flex items-center justify-center z-40"
        whileHover={{ scale: 1.1 }}
        animate={{ rotate: isPlaying ? 360 : 0 }}
        transition={{
          repeat: isPlaying ? Infinity : 0,
          duration: 4,
          ease: "linear",
        }}
      >
        <div className="absolute w-full h-full rounded-full opacity-20 bg-gradient-to-br from-white"></div>
        <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-red-600"></div>
        </div>
      </motion.div>

      {/* CONTROLS - Increased z-index */}
      <div className="fixed bottom-10 left-10 flex flex-col gap-3 z-40">
        <motion.button
          onClick={togglePlay}
          className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white shadow-md border border-white/30 font-semibold"
          whileHover={{
            scale: 1.1,
            boxShadow: "0px 8px 20px rgba(255,255,255,0.3)",
          }}
          whileTap={{
            scale: 0.95,
            boxShadow: "0px 4px 10px rgba(255,255,255,0.2)",
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </motion.button>

        <motion.select
          onChange={(e) => setTheme(e.target.value)}
          className="px-6 py-3 rounded-xl bg-gray-800 backdrop-blur-sm text-white shadow-md border border-white/30 font-semibold"
          whileHover={{
            scale: 1.05,
            boxShadow: "0px 6px 18px rgba(255,255,255,0.25)",
          }}
          whileTap={{
            scale: 0.97,
            boxShadow: "0px 4px 10px rgba(255,255,255,0.2)",
          }}
        >
          <option value="dark">Dark</option>
          <option value="neon">Neon</option>
          <option value="retro">Retro</option>
        </motion.select>

        {/* FILE INPUT */}
        <motion.label
          htmlFor="fileInput"
          className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white shadow-md border border-white/30 font-semibold cursor-pointer grid items-center justify-center"
          whileHover={{
            scale: 1.05,
            boxShadow: "0px 6px 18px rgba(255,255,255,0.25)",
          }}
          whileTap={{
            scale: 0.97,
            boxShadow: "0px 4px 10px rgba(255,255,255,0.2)",
          }}
        >
          Add Song
        </motion.label>
        <input
          id="fileInput"
          type="file"
          accept="audio/mpeg"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* PLAYLIST DISPLAY */}
        {playlist.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto text-white backdrop-blur-sm bg-black/30 rounded-lg p-2 border border-white/20">
            {playlist.map((song, i) => (
              <div
                key={i}
                className={`py-1 px-2 rounded transition-colors ${
                  i === currentIndex 
                    ? "bg-white/30 text-white font-semibold" 
                    : "bg-white/10 text-gray-200 hover:bg-white/20"
                }`}
              >
                Song {i + 1}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DRAG-AND-DROP HINT - Keep highest z-index */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center text-white text-4xl font-bold pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Drop your song here 🎶
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}