import React, { useEffect, useRef, useState, useCallback } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import FileTranslator from "./components/FileTranslator"
import SpeakerCaption from "./components/SpeakerCaption"
import { useSpeechRecognition } from "./hooks/listener"
import { initScene } from "@webspatial/react-sdk"

function App() {
  const { history, interimText, isListening, audioLevels, start, stop } = useSpeechRecognition()
  const [isStarting, setIsStarting] = useState(false)
  const openedSpeakers = useRef(new Set())
  const activeWindowsRef = useRef(new Set())
  const location = useLocation()
  
  const isSpeakerRoute = location.pathname.includes('/speaker/')

  useEffect(() => {
    const channel = new BroadcastChannel('captions_channel')
    const handleMessage = (e) => {
      if (e.data.type === 'WINDOW_STATUS') {
        if (e.data.status === 'open') {
          activeWindowsRef.current.add(e.data.speaker)
          setIsStarting(false)
        } else if (e.data.status === 'closed') {
          activeWindowsRef.current.delete(e.data.speaker)
          if (activeWindowsRef.current.size === 0 && isListening && !isStarting) {
            stop()
          }
        }
      } else if (e.data.type === 'SYNC_REQUEST') {
        channel.postMessage({ type: 'SYNC_RESPONSE', history })
      }
    }
    channel.addEventListener('message', handleMessage)
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [isListening, stop, isStarting, history])

  const handleStart = () => {
    openedSpeakers.current.clear()
    setIsStarting(true)
    start()
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
        defaultSize: { width: 1600, height: 600 },
        worldAlignment: 'adaptive'
      }))
    }

    window.open(url, sceneName)
  }, [])

  useEffect(() => {
    if (!isListening || isSpeakerRoute) return
    history.forEach(item => openSpeakerWindow(item.speaker))
    if (interimText.trim()) {
      const isLeft = audioLevels.left > audioLevels.right
      const currentSpeaker = isLeft ? 'Person A' : 'Person B'
      openSpeakerWindow(currentSpeaker)
    }
  }, [history, interimText, isListening, isSpeakerRoute, audioLevels, openSpeakerWindow])

  useEffect(() => {
    if (isSpeakerRoute) document.documentElement.classList.add('is-speaker-page')
    else document.documentElement.classList.remove('is-speaker-page')
  }, [isSpeakerRoute])

  return (
    <div className="app-root">
      {!isSpeakerRoute && <Navbar onReset={stop} isListening={isListening} />}

      <Routes>
        <Route path="/speaker/:speakerName" element={<SpeakerCaption />} />
        
        {/* The Global Glass Container */}
        <Route
          path="*"
          element={
            <div className={`content-scene ${isListening && location.pathname === '/' ? 'state-active' : ''}`} enable-xr="true">
              
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
