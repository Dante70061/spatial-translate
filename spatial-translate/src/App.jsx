import React, { useEffect, useRef, useState } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import FileTranslator from "./components/FileTranslator"
import SpeakerCaption from "./components/SpeakerCaption"
import { useSpeechRecognition } from "./hooks/listener"
import { initScene } from "@webspatial/react-sdk"

function App() {
  const { history, interimText, isListening, audioLevels, start, stop } = useSpeechRecognition()
  const [isStarting, setIsStarting] = useState(false);
  const openedSpeakers = useRef(new Set());
  const activeWindowsRef = useRef(new Set());
  const location = useLocation();
  const isSpeakerRoute = location.pathname.includes('/speaker/');

  // Watchdog to see if bubbles are still open
  useEffect(() => {
    const channel = new BroadcastChannel('captions_channel');
    
    channel.onmessage = (e) => {
      if (e.data.type === 'WINDOW_STATUS') {
        if (e.data.status === 'open') {
          activeWindowsRef.current.add(e.data.speaker);
          setIsStarting(false); // First window is open, we are officially active
        } else if (e.data.status === 'closed') {
          activeWindowsRef.current.delete(e.data.speaker);
          
          if (activeWindowsRef.current.size === 0 && isListening && !isStarting) {
            console.log("Last window closed, recovering UI...");
            stop();
          }
        }
      }
    };

    // Periodic safety check with a grace period
    const checkInterval = setInterval(() => {
      // Only check if we are NOT in the middle of starting up
      if (isListening && !isStarting && activeWindowsRef.current.size > 0) {
        const snapshot = new Set(activeWindowsRef.current);
        activeWindowsRef.current.clear();
        channel.postMessage({ type: 'PING' });
        
        setTimeout(() => {
          if (activeWindowsRef.current.size === 0 && isListening && !isStarting) {
            console.log("Heartbeat failed, recovering UI...");
            stop();
          }
        }, 1500);
      }
    }, 4000);

    return () => {
      clearInterval(checkInterval);
      channel.close();
    };
  }, [isListening, stop, isStarting]);

  const handleStart = () => {
    setIsStarting(true);
    start();
  };

  useEffect(() => {
    if (isSpeakerRoute) {
      document.documentElement.classList.add('is-speaker-page');
    } else {
      document.documentElement.classList.remove('is-speaker-page');
    }
  }, [isSpeakerRoute]);

  useEffect(() => {
    if (!isListening) {
      openedSpeakers.current.clear();
    }
  }, [isListening]);

  useEffect(() => {
    if (!isListening || isSpeakerRoute) return;

    history.forEach(item => {
      if (!openedSpeakers.current.has(item.speaker)) {
        openSpeakerWindow(item.speaker);
      }
    });

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
        defaultSize: { width: 1000, height: 800 }
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
      {!isSpeakerRoute && <Navbar onReset={stop} />}

      <Routes>
        <Route path="/speaker/:speakerName" element={<SpeakerCaption />} />
        <Route
          path="/"
          element={
            <div className={`home-page ${isListening ? 'collapsed' : ''}`} enable-xr="true">
              {!isListening && (
                <div className="home-content">
                  <div style={{ textAlign: "center", marginBottom: "40px" }}>
                    <h1>Vision Pro Auto-Caption</h1>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.2rem" }}>
                      Experience spatial, person-anchored captions.
                    </p>
                  </div>

                  {/* The Centralized Hero Interaction */}
                  <button 
                    className="liquid-glass-button hero-start" 
                    onClick={handleStart}
                    style={{ width: '280px', height: '60px', borderRadius: '30px', fontSize: '1.1rem' }}
                  >
                    Start Spatial Captions
                  </button>

                  <div style={{ marginTop: "60px", color: "white", textAlign: "center", opacity: 0.4 }}>
                    <p>Speak to spawn anchored bubbles in your space.</p>
                  </div>
                </div>
              )}
            </div>
          }
        />
        <Route path="/translate" element={<FileTranslator />} />
      </Routes>
    </>
  )
}

export default App
