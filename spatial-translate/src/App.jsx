import React from "react"
import Navbar from "./components/Navbar"

function App() {

  const handleStart = (language) => {
    console.log("Starting translation to:", language)
    // Connect WebSocket here
  }

  const handleStop = () => {
    console.log("Stopping translation")
    // Close WebSocket here
  }

  return (
    <>
      <Navbar onStart={handleStart} onStop={handleStop} />
      <div style={{ marginTop: "100px" }}>
        {/* Your spatial app content here */}
      </div>
    </>
  )
}

export default App
