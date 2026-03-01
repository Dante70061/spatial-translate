import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import "./Navbar.css"

export default function Navbar({ onStart, onStop, isListening }) {
  const [language, setLanguage] = useState("Spanish")
  const location = useLocation() // get current route

  const handleToggle = () => {
    if (isListening) {
      onStop && onStop() // stop speech recognition
    } else {
      onStart && onStart() // start speech recognition
    }
  }

  // hide Start/Stop button if on /translate
  const showStartButton = location.pathname !== "/translate"

  return (
    <nav className="navbar" enable-xr="true">
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
            enable-xr="true"
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
              className={`liquid-glass-button ${isListening ? "stop" : "start"}`}
              onClick={handleToggle}
              enable-xr="true"
            >
              {isListening ? "Stop" : "Start"}
            </button>
          )}

          {/* PDF Translate button */}
          <Link 
            to="/translate" 
            className="liquid-glass-button translate" 
            enable-xr="true"
          >
            PDF Translate
          </Link>

          {/* Live Captions button */}
          <Link 
            to="/" 
            className="liquid-glass-button translate" 
            enable-xr="true"
          >
            Live Captions
          </Link>
        </div>

      </div>
    </nav>
  )
}
