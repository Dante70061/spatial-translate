import React, { useEffect, useRef, useState, useCallback } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import FileTranslator from "./components/FileTranslator"
import SpeakerCaption from "./components/SpeakerCaption"
import { useSpeechRecognition } from "./hooks/listener.jsx"
import { initScene } from "@webspatial/react-sdk"

function App() {
  const [appLanguage, setAppLanguage] = useState("English");
  
  useEffect(() => {
    window.appLanguage = appLanguage;
    window.setAppLanguage = setAppLanguage;
  }, [appLanguage]);

  const { history, isListening, audioLevels, start, stop } = useSpeechRecognition({ passive: false })
  const [isStarting, setIsStarting] = useState(false)
  const openedSpeakers = useRef(new Set())
  const windowRefs = useRef({}) 
  const location = useLocation()
  
  const isSpeakerRoute = location.pathname.includes('/speaker/')
  const [uiIsActive, setUiIsActive] = useState(false);

  useEffect(() => {
    if (isListening) {
      setUiIsActive(true);
      setIsStarting(false);
    }
  }, [isListening]);

  const handleReset = useCallback(() => {
    console.log("[APP] handleReset - Closing All Windows");
    setUiIsActive(false);
    stop();
    Object.keys(windowRefs.current).forEach(name => {
      const win = windowRefs.current[name];
      if (win && !win.closed) win.close();
    });
    windowRefs.current = {};
    openedSpeakers.current.clear();
    setIsStarting(false);
  }, [stop]);

  const handleStart = () => {
    console.log("[APP] handleStart - Atomic Initialize");
    setUiIsActive(true);
    const isDebug = appLanguage === 'Debug Mode';

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!window.__GLOBAL_AC__ || window.__GLOBAL_AC__.state === 'closed') {
          window.__GLOBAL_AC__ = new AudioCtx({ sampleRate: 16000 });
        }
        const ac = window.__GLOBAL_AC__;
        ac.resume();
        
        // Context Kick
        const buffer = ac.createBuffer(1, 1, 22050);
        const source = ac.createBufferSource();
        source.buffer = buffer;
        source.connect(ac.destination);
        source.start(0);

        if (isDebug) {
          /* global __XR_ENV_BASE__ */
          let baseUrl = typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : '';
          if (baseUrl && !baseUrl.endsWith('/')) baseUrl += '/';
          const targetSrc = `${window.location.origin}${baseUrl}test_recording.m4a`;

          if (!window.__DEBUG_AUDIO_EL__) {
            window.__DEBUG_AUDIO_EL__ = new Audio();
            window.__DEBUG_AUDIO_EL__.crossOrigin = "anonymous";
            window.__DEBUG_AUDIO_EL__.loop = true;
          }
          
          const da = window.__DEBUG_AUDIO_EL__;
          
          // SYNCHRONOUS RESET: Fixes "Burst" and "Second Play" issues
          da.pause();
          if (da.src !== targetSrc) da.src = targetSrc;
          da.currentTime = 0;

          if (!window.__DEBUG_SOURCE_NODE__) {
            window.__DEBUG_SOURCE_NODE__ = ac.createMediaElementSource(da);
          }
          window.__DEBUG_SOURCE_NODE__.connect(ac.destination);
          
          // Execute play immediately in gesture stack
          da.play().then(() => {
            console.log("[APP] Debug audio active from gesture");
          }).catch(e => console.error("[APP] Debug play failed:", e));
        }
      }
    } catch (e) { console.error("[APP] Critical handshake failure:", e); }

    openedSpeakers.current.clear();
    setIsStarting(true);
    
    // Start engine, and if it fails, reset UI so user can try again
    start().catch(err => {
      console.error("[APP] Engine start failed:", err);
      setIsStarting(false);
      setUiIsActive(false);
    });

    openSpeakerWindow('Live Captions');
  }

  const openSpeakerWindow = useCallback((speakerName) => {
    if (openedSpeakers.current.has(speakerName)) return;
    openedSpeakers.current.add(speakerName);
    const sceneName = `speaker_${speakerName.replace(/\s+/g, '_')}`;
    let baseUrl = typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : '';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    const url = `${baseUrl}/speaker/${encodeURIComponent(speakerName)}`;
    if (typeof initScene === 'function') {
      initScene(sceneName, (prev) => ({ ...prev, defaultSize: { width: 1200, height: 600 }, worldAlignment: 'adaptive' }));
    }
    const win = window.open(url, sceneName);
    if (win) windowRefs.current[speakerName] = win;
  }, []);

  useEffect(() => {
    if (isSpeakerRoute) document.documentElement.classList.add('is-speaker-page');
    else document.documentElement.classList.remove('is-speaker-page');
  }, [isSpeakerRoute]);

  return (
    <div className="app-root" enable-xr-monitor>
      {!isSpeakerRoute && (
        <Navbar 
          onReset={handleReset} 
          isListening={uiIsActive}
          language={appLanguage}
          setLanguage={setAppLanguage}
        />
      )}
      <Routes>
        <Route path="/speaker/:speakerName" element={<SpeakerCaption />} />
        <Route path="*" element={
          <div className={`content-scene ${uiIsActive && location.pathname === '/' ? 'state-active' : ''}`} enable-xr>
            <div className="scene-view-layer" style={{ opacity: location.pathname === '/' && !uiIsActive ? 1 : 0, visibility: location.pathname === '/' && !uiIsActive ? 'visible' : 'hidden' }}>
              <div className="home-content-container">
                <header className="hero-header"><h1 className="hero-title">Vision Pro Auto-Caption</h1><p className="hero-subtitle">Experience spatial, person-anchored captions.</p></header>
                <main className="hero-actions">
                  <button className="liquid-glass-button hero-start" onClick={handleStart}>
                    {isStarting ? "Initializing..." : "Start Spatial Captions"}
                  </button>
                </main>
                <footer className="hero-footer"><p>Speak to spawn anchored bubbles in your space.</p></footer>
              </div>
            </div>
            <div className="scene-view-layer" style={{ opacity: location.pathname === '/translate' ? 1 : 0, visibility: location.pathname === '/translate' ? 'visible' : 'hidden' }}>
              <FileTranslator />
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}

export default App
