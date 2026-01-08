// src/App.jsx
import React, { useState } from "react";
import LyricCard from "./Components/LyricCard.jsx";
import Login from "./Components/Login.jsx";
import Dashboard from './Components/Dashboard.jsx'

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  return (
    <LyricCard>
      {!token ? (
        <Login setToken={setToken} />
      ) : (
        <Dashboard token={token} />
      )}
    </LyricCard>
  );
}

export default App;
