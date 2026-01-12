// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LyricCard from "./Components/LyricCard.jsx";
import Login from "./Components/Login.jsx";
import Dashboard from './Components/Dashboard.jsx'

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  return (
    <Router>
      <Routes>
        <Route path="/subscription-cancel" element={<Navigate to="/" />} />
        <Route path="/" element={
          <LyricCard>
            {!token ? (
              <Login setToken={setToken} />
            ) : (
              <Dashboard token={token} />
            )}
          </LyricCard>
        } />
      </Routes>
    </Router>
  );
}

export default App;
