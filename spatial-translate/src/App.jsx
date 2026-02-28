// App.jsx
import React from "react"
import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Subtitles from "./components/Subtitles"
import FileTranslator from "./components/FileTranslator"
import { useSpeechRecognition } from "./hooks/listener"



function App() {
  // SINGLE instance of speech recognition for subtitles
  const { transcript, isListening, start, stop } = useSpeechRecognition()

  return (
    <>
      {/* Navbar controls speech recognition */}
      <Navbar onStart={start} onStop={stop} />

      <Routes>
        {/* Main page: File upload + live subtitles */}
        <Route
          path="/"
          element={
            <>
              <div style={{ marginTop: "100px", textAlign: "center" }}>
                <h1>Main Page</h1>
              </div>

              {/* File upload (independent) */}
              <FileTranslator />

              {/* Live subtitles from speech */}
              <div style={{ marginTop: "50px", color: "white", textAlign: "center" }}>
                <h1>Subtitles:</h1>
                <p>{transcript || "Waiting for speech..."}</p>
              </div>
            </>
          }
        />

        {/* Translate page */}
        <Route
          path="/translate"
          element={
            <>
              <Subtitles />
            </>
          }
        />
      </Routes>
    </>
  )
}

export default App
