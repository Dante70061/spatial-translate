import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import "./Navbar.css"

export default function Navbar({ onStart, onStop }) {
  const [isRunning, setIsRunning] = useState(false)
  const [language, setLanguage] = useState("Spanish")
  const location = useLocation() // get current route

  const handleToggle = () => {
    if (isRunning) {
      onStop && onStop() // stop speech recognition
    } else {
      onStart && onStart() // start speech recognition
    }
    setIsRunning(!isRunning)
  }

  // hide Start/Stop button if on /translate
  const showStartButton = location.pathname !== "/translate"

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

          {/* Start/Stop button only shows when not on /translate */}
          {showStartButton && (
            <button
              className={`control-button ${isRunning ? "stop" : "start"}`}
              onClick={handleToggle}
            >
              {isRunning ? "Stop" : "Start"}
            </button>
          )}

          {/* PDF Translate button */}
          <Link to="/translate">
            <button className="control-button translate">PDF Translate</button>
          </Link>

          {/* Live Captions button */}
          <Link to="/">
            <button className="control-button translate">Live Captions</button>
          </Link>
        </div>

      </div>
    </nav>
  )
}
