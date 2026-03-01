// App.jsx
import React from "react"
import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Subtitles from "./components/Subtitles"
import FileTranslator from "./components/FileTranslator"
import { useSpeechRecognition } from "./hooks/listener"

function App() {
  // Destructure the NEW return values: history and interimText
  const { history, interimText, isListening, start, stop } = useSpeechRecognition()

  return (
    <>
      <Navbar onStart={start} onStop={stop} />

      <Routes>
        <Route
          path="/"
          element={
            <>
              <div style={{ marginTop: "100px", textAlign: "center" }}>
                <h1>Vision Pro Auto-Caption</h1>
              </div>

              <FileTranslator />

              <div style={{ marginTop: "50px", color: "white", textAlign: "center", padding: '20px' }}>
                <h2>Live Captions:</h2>

                {isListening && (
                  <p style={{ color: "#4DA6FF", fontSize: "14px" }}>🎙️ Mic Active</p>
                )}

                {/* Show the conversation history (Finalized sentences) */}
                <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '15px' }}>
                  {history.map((item, index) => (
                    <p key={index} style={{ marginBottom: '10px' }}>
                      <strong style={{ color: item.angle < 0 ? '#ff4da6' : '#4dff88' }}>
                        {item.angle < 0 ? "Person A (Left)" : "Person B (Right)"}:
                      </strong> {item.text}
                    </p>
                  ))}

                  {/* Show the live text as it's being typed */}
                  <p style={{ fontStyle: 'italic', opacity: 0.7 }}>
                    {interimText || (history.length === 0 && "Speak to see captions...")}
                  </p>
                </div>
              </div>
            </>
          }
        />
        <Route path="/translate" element={<Subtitles />} />
      </Routes>
    </>
  )
}

export default App
