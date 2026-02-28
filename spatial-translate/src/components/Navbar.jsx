import React, { useState } from "react"
import "./Navbar.css"

export default function Navbar({ onStart, onStop }) {
  const [isRunning, setIsRunning] = useState(false)
  const [language, setLanguage] = useState("Spanish")

  const handleToggle = () => {
    if (isRunning) {
      onStop && onStop()
    } else {
      onStart && onStart(language)
    }
    setIsRunning(!isRunning)
  }

  return (
    <nav className="navbar">
      
      {/* Left - Logo */}
      <div className="navbar-left">
        <h2 className="logo">SpatialTranslate</h2>
      </div>

      {/* Right - Controls */}
      <div className="navbar-right">

        {/* Language Selector */}
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

        {/* Start / Stop Button */}
        <button
          className={`control-button ${isRunning ? "stop" : "start"}`}
          onClick={handleToggle}
        >
          {isRunning ? "Stop" : "Start"}
        </button>

        {/* Profile */}
        <div className="profile-circle">
          D
        </div>

      </div>

    </nav>
  )
}
