// App.jsx
import React from "react"
import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Subtitles from "./components/Subtitles"
import FileTranslator from "./components/FileTranslator"
import { useSpeechRecognition } from "./hooks/listener"

function App() {
  // Destructure the NEW return values: history and interimText
  const { history, interimText, isListening, audioLevels, start, stop } = useSpeechRecognition()

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

              

              {/* Audio Visualizer Test Section */}
              <div style={{ marginTop: "30px", textAlign: "center", color: "white" }}>
                <h3>Audio Channel Levels (Testing)</h3>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '40px', 
                  alignItems: 'flex-end', 
                  height: '250px', 
                  marginBottom: '10px',
                  background: 'rgba(0,0,0,0.2)',
                  width: '300px',
                  margin: '30px auto',
                  padding: '20px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ 
                    width: '60px', 
                    background: 'linear-gradient(to top, #ff4da6, #ff80bf)', 
                    height: `${Math.sqrt(audioLevels.left) * 100}%`, 
                    minHeight: '4px',
                    transition: 'height 0.05s ease', 
                    borderRadius: '10px 10px 2px 2px',
                    boxShadow: `0 0 ${audioLevels.left * 20}px #ff4da6`
                  }}></div>
                  <div style={{ 
                    width: '60px', 
                    background: 'linear-gradient(to top, #4dff88, #80ffaa)', 
                    height: `${Math.sqrt(audioLevels.right) * 100}%`, 
                    minHeight: '4px',
                    transition: 'height 0.05s ease', 
                    borderRadius: '10px 10px 2px 2px',
                    boxShadow: `0 0 ${audioLevels.right * 20}px #4dff88`
                  }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '80px', marginTop: '-10px', fontWeight: 'bold' }}>
                  <span style={{ color: '#ff4da6' }}>LEFT (A)</span>
                  <span style={{ color: '#4dff88' }}>RIGHT (B)</span>
                </div>
              </div>

              <div style={{ marginTop: "50px", color: "white", textAlign: "center", padding: '20px' }}>
                <h2>Live Captions:</h2>

                {isListening && (
                  <p style={{ color: "#4DA6FF", fontSize: "14px" }}>🎙️ Mic Active</p>
                )}

                {/* Show the conversation history (Finalized sentences) */}
                <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '15px' }}>
                  {history.map((item, index) => {
                    const showSpeaker = index === 0 || history[index - 1].speaker !== item.speaker;
                    return (
                      <p key={index} style={{ marginBottom: '10px' }}>
                        {showSpeaker && (
                          <strong style={{ color: item.speaker === 'Person A' ? '#ff4da6' : '#4dff88' }}>
                            {item.speaker}:
                          </strong>
                        )} {item.text}
                      </p>
                    );
                  })}

                  {/* Show the live text as it's being typed */}
                  <p style={{ fontStyle: 'italic', opacity: 0.7 }}>
                    {interimText || (history.length === 0 && "Speak to see captions...")}
                  </p>
                </div>
              </div>
            </>
          }
        />
        <Route path="/translate" element={<FileTranslator />} />
      </Routes>
    </>
  )
}

export default App
