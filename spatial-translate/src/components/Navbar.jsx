// components/Navbar.jsx
import React, { useState } from "react"
import "./Navbar.css"

export default function Navbar({ onStart, onStop }) {
  const [isRunning, setIsRunning] = useState(false)
  const [language, setLanguage] = useState("Spanish")

  const handleToggle = () => {
    if (isRunning) {
      onStop && onStop() // stop speech recognition
    } else {
      onStart && onStart() // start speech recognition
    }
    setIsRunning(!isRunning)
  }

  return (
  <nav className="navbar">
    <div className="navbar-inner">

      {/* Left - Logo */}
      <div className="navbar-left">
        <h2 className="logo">SpatialTranslate</h2>
      </div>

      {/* Right - Controls */}
      <div className="navbar-right">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="language-select"
        >
          <option>Spanish</option>
          <option>French</option>
          <option>German</option>
          <option>Japanese</option>
          <option>Chinese</option>
        </select>

        <button
          className={`control-button ${isRunning ? "stop" : "start"}`}
          onClick={handleToggle}
        >
          {isRunning ? "Stop" : "Start"}
        </button>
      </div>

    </div>
  </nav>
)

}
