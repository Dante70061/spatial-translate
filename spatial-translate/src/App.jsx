// App.jsx
import React from "react"
import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Subtitles from "./components/Subtitles"
import FileTranslator from "./components/FileTranslator"
import { useSpeechRecognition } from "./hooks/listener"

function App() {
  // SINGLE instance of speech recognition for subtitles
  const { transcript, isListening, error, start, stop } = useSpeechRecognition()

  return (
    <>
      {/* Navbar controls speech recognition */}
      <Navbar onStart={start} onStop={stop} />

      <Routes>
        {/* ================= MAIN PAGE ================= */}
        <Route
          path="/"
          element={
            <>
              <div style={{ marginTop: "100px", textAlign: "center" }}>
                <h1>Main Page</h1>
              </div>

              {/* File upload (independent) */}
              <FileTranslator />

              {/* ERROR DISPLAY */}
              {error && (
                <div
                  style={{
                    marginTop: "20px",
                    textAlign: "center",
                    color: "#ff4d4d",
                    fontWeight: "500",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Live subtitles */}
              <div style={{ marginTop: "50px", color: "white", textAlign: "center" }}>
                <h1>Subtitles:</h1>

                {isListening && (
                  <p style={{ color: "#4DA6FF", fontSize: "14px" }}>
                    Listening...
                  </p>
                )}

                <p style={{ fontSize: "20px" }}>
                  {transcript || "Waiting for speech..."}
                </p>
              </div>
            </>
          }
        />

        {/* ================= TRANSLATE PAGE ================= */}
        <Route
          path="/translate"
          element={<Subtitles />}
        />
      </Routes>
    </>
  )
}

export default App
