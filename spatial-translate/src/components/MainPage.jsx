import React from "react"
import Navbar from "./Navbar"
import "../index.css"

export default function MainPage() {
  const handleStart = (lang) => {
    console.log("Start clicked for language:", lang)
  }

  const handleStop = () => {
    console.log("Stop clicked")
  }

  return (
    <div>
      <Navbar onStart={handleStart} onStop={handleStop} />

      <div className="main-container">
        <h1>Welcome to Spatial Translate</h1>
        <p>Choose a language and start translating!</p>
      </div>
    </div>
  )
}
