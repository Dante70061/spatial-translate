import React, { useEffect, useRef, useState, useCallback } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import FileTranslator from "./components/FileTranslator"
import SpeakerCaption from "./components/SpeakerCaption"
import { useSpeechRecognition } from "./hooks/listener.jsx"
import { initScene } from "@webspatial/react-sdk"

function App() {
  const [appLanguage, setAppLanguage] = useState("English");
  
  // Expose to window for the hook to pick up
  useEffect(() => {
    window.appLanguage = appLanguage;
    window.setAppLanguage = setAppLanguage;
  }, [appLanguage]);

  // Main window is the HOST (has the click gesture)
  const { history, interimText, isListening, audioLevels, start, stop } = useSpeechRecognition({ passive: false })
  const [isStarting, setIsStarting] = useState(false)
  const openedSpeakers = useRef(new Set())
  const windowRefs = useRef({}) // Store window objects to close them later
  const activeWindowsRef = useRef(new Set())
  const location = useLocation()
  
  const isSpeakerRoute = location.pathname.includes('/speaker/')

  const handleReset = useCallback(() => {
    console.log("[APP] handleReset called - Stopping engine and Closing Windows");
    stop();
    
    // Close all tracked speaker windows
    Object.keys(windowRefs.current).forEach(name => {
      const win = windowRefs.current[name];
      if (win && !win.closed) {
        win.close();
      }
    });
    windowRefs.current = {};
    openedSpeakers.current.clear();
    setIsStarting(false);
  }, [stop]);

  useEffect(() => {
    const channel = new BroadcastChannel('captions_channel')
    const handleMessage = (e) => {
      if (e.data.type === 'WINDOW_STATUS') {
        if (e.data.status === 'open') {
          activeWindowsRef.current.add(e.data.speaker)
          setIsStarting(false)
        } else if (e.data.status === 'closed') {
          activeWindowsRef.current.delete(e.data.speaker)
        }
      }
    }
    channel.addEventListener('message', handleMessage)
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [])

  const handleStart = () => {
    console.log("[APP] handleStart called - Starting engine and Opening Speaker Window");
    
    // Resume/Kick AC synchronously in click handler
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!window.__GLOBAL_AC__ || window.__GLOBAL_AC__.state === 'closed') {
          window.__GLOBAL_AC__ = new AudioCtx({ sampleRate: 16000 });
        }
        const ac = window.__GLOBAL_AC__;
        ac.resume();
        const buffer = ac.createBuffer(1, 1, 22050);
        const source = ac.createBufferSource();
        source.buffer = buffer;
        source.connect(ac.destination);
        source.start(0);
      }
    } catch (e) {
      console.error("[APP] Failed to pre-warm AudioContext:", e);
    }

    openedSpeakers.current.clear()
    windowRefs.current = {}
    setIsStarting(true)
    
    // Start local engine (has the gesture)
    // We await the setup of audio nodes to ensure the session is active
    start().then(() => {
      // Small delay to ensure the AudioContext is fully "warmed up" 
      // before opening a new window that might steal focus.
      setTimeout(() => {
        openSpeakerWindow('Live Captions')
      }, 500);
    });
  }

  const openSpeakerWindow = useCallback((speakerName) => {
    if (openedSpeakers.current.has(speakerName)) return
    openedSpeakers.current.add(speakerName)
    
    const sceneName = `speaker_${speakerName.replace(/\s+/g, '_')}`
    
    /* global __XR_ENV_BASE__ */
    let baseUrl = typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : ''
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
    
    const url = `${baseUrl}/speaker/${encodeURIComponent(speakerName)}`
    
    if (typeof initScene === 'function') {
      initScene(sceneName, (prev) => ({
        ...prev,
        defaultSize: { width: 1000, height: 500 },
        worldAlignment: 'adaptive'
      }))
    }

    const win = window.open(url, sceneName)
    if (win) {
      windowRefs.current[speakerName] = win;
    }
  }, [])

  useEffect(() => {
    if (isSpeakerRoute) document.documentElement.classList.add('is-speaker-page')
    else document.documentElement.classList.remove('is-speaker-page')
  }, [isSpeakerRoute])

  return (
    <div className="app-root" enable-xr-monitor>
      {!isSpeakerRoute && (
        <Navbar 
          onReset={handleReset} 
          isListening={isListening} 
          language={appLanguage}
          setLanguage={setAppLanguage}
        />
      )}

      <Routes>
        <Route path="/speaker/:speakerName" element={<SpeakerCaption />} />
        
        {/* The Global Glass Container */}
        <Route
          path="*"
          element={
            <div className={`content-scene ${isListening && location.pathname === '/' ? 'state-active' : ''}`} enable-xr>
              
              <div className="scene-view-layer" style={{
                opacity: location.pathname === '/' && !isListening ? 1 : 0,
                visibility: location.pathname === '/' && !isListening ? 'visible' : 'hidden'
              }}>
                <div className="home-content-container">
                  <header className="hero-header">
                    <h1 className="hero-title">Vision Pro Auto-Caption</h1>
                    <p className="hero-subtitle">Experience spatial, person-anchored captions.</p>
                  </header>
                  <main className="hero-actions">
                    <button className="liquid-glass-button hero-start" onClick={handleStart}>
                      Start Spatial Captions
                    </button>
                  </main>
                  <footer className="hero-footer">
                    <p>Speak to spawn anchored bubbles in your space.</p>
                  </footer>
                </div>
              </div>

              <div className="scene-view-layer" style={{
                opacity: location.pathname === '/translate' ? 1 : 0,
                visibility: location.pathname === '/translate' ? 'visible' : 'hidden'
              }}>
                <FileTranslator />
              </div>

            </div>
          }
        />
      </Routes>
    </div>
  )
}

export default App
