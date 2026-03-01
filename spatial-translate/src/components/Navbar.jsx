import React, { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import "./Navbar.css"

export default function Navbar({ onReset, isListening }) {
  const [language, setLanguage] = useState("English")
  const location = useLocation()
  const navigate = useNavigate()

  return (
    /* The 'active' class now handles the subtle downward slide instead of 'hidden' */
    <nav className={`navbar ${isListening ? 'active' : ''}`} enable-xr="true">
      <div className="navbar-inner">
        <div className="navbar-left">
          <h2 className="logo">SpatialTranscribe</h2>
        </div>

        <div className="navbar-right">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="language-select"
          >
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
              <option>Japanese</option>
              <option>Chinese</option>
          </select>

          <Link to="/translate" className="liquid-glass-button translate">
            PDF Translate
          </Link>

          {isListening ? (
            <button 
              className="liquid-glass-button translate"
              onClick={() => {
                if (onReset) onReset();
                if (location.pathname !== "/") {
                  navigate("/");
                }
              }}
              style={{ background: 'rgba(255, 100, 100, 0.2)' }}
            >
              End Session
            </button>
          ) : (
            <Link 
              to="/" 
              className="liquid-glass-button translate"
            >
              Live Captions
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
