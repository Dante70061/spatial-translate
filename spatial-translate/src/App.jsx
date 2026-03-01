import React, { useEffect, useRef } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import FileTranslator from "./components/FileTranslator"
import SpeakerCaption from "./components/SpeakerCaption"
import { useSpeechRecognition } from "./hooks/listener"
import { initScene } from "@webspatial/react-sdk"

function App() {
  const { history, interimText, isListening, audioLevels, start, stop } = useSpeechRecognition()
  const openedSpeakers = useRef(new Set());
  const location = useLocation();
  const isSpeakerRoute = location.pathname.includes('/speaker/');

  // Apply a class to <html> for speaker windows (so they have transparent backgrounds)
  useEffect(() => {
    if (isSpeakerRoute) {
      document.documentElement.classList.add('is-speaker-page');
    } else {
      document.documentElement.classList.remove('is-speaker-page');
    }
  }, [isSpeakerRoute]);

  // Reset tracking when recording stops
  useEffect(() => {
    if (!isListening) {
      openedSpeakers.current.clear();
    }
  }, [isListening]);

  // Automatically open windows for new speakers
  useEffect(() => {
    if (!isListening || isSpeakerRoute) return;

    // Check history for new speakers
    history.forEach(item => {
      if (!openedSpeakers.current.has(item.speaker)) {
        openSpeakerWindow(item.speaker);
      }
    });

    // Also check interim for the current speaker
    if (interimText.trim()) {
      const isLeft = audioLevels.left > audioLevels.right;
      const currentSpeaker = isLeft ? 'Person A' : 'Person B';
      if (!openedSpeakers.current.has(currentSpeaker)) {
        openSpeakerWindow(currentSpeaker);
      }
    }
  }, [history, interimText, isListening, isSpeakerRoute, audioLevels]);

  const openSpeakerWindow = (speakerName) => {
    openedSpeakers.current.add(speakerName);
    const sceneName = `speaker_${speakerName.replace(/\s+/g, '_')}`;
    
    if (typeof initScene === 'function') {
      initScene(sceneName, (prev) => ({
        ...prev,
        defaultSize: { width: 600, height: 400 }
      }));
    }

    /* global __XR_ENV_BASE__ */
    let baseUrl = typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : '';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    window.open(`${baseUrl}/speaker/${encodeURIComponent(speakerName)}`, sceneName);
  };

  return (
    <>
      {!isSpeakerRoute && <Navbar onStart={start} onStop={stop} isListening={isListening} />}

      <Routes>
        <Route path="/speaker/:speakerName" element={<SpeakerCaption />} />
        <Route
          path="/"
          element={
            <div className={`main-page-container ${isListening ? 'collapsed' : ''}`} enable-xr="true">
              <div style={{ marginTop: "100px", textAlign: "center" }}>
                <h1>Vision Pro Auto-Caption</h1>
                <p style={{ color: "rgba(255,255,255,0.6)" }}>
                  Captions will spawn in separate windows for each speaker.
                </p>
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
                <p style={{ opacity: 0.5 }}>Click "Start Listening" in the navbar to begin.</p>
              </div>
            </div>
          }
        />
        <Route path="/translate" element={<FileTranslator />} />
      </Routes>
    </>
  )
}

export default App
