import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import "./Navbar.css"

export default function Navbar({ onReset, isListening }) {
  const [language, setLanguage] = useState("Spanish")
  const location = useLocation()

  return (
    /* The 'active' class now handles the subtle downward slide instead of 'hidden' */
    <nav className={`navbar ${isListening ? 'active' : ''}`} enable-xr="true">
      <div className="navbar-inner">
        <div className="navbar-left">
          <h2 className="logo">SpatialTranslate</h2>
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

          <Link 
            to="/" 
            className="liquid-glass-button translate"
            onClick={() => onReset && onReset()}
          >
            Live Captions
          </Link>
        </div>
      </div>
    </nav>
  )
}
