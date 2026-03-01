import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/* global __XR_ENV_BASE__ */
const SOCKET_URL = 'https://spatial-translate-11.onrender.com';
console.log("[SOCKET] Attempting connection to:", SOCKET_URL);

const socket = io(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['polling', 'websocket'], // Use polling first for stability, then upgrade
  reconnectionAttempts: 5,
  timeout: 10000
});

export function useSpeechRecognition() {
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState({ left: 0, right: 0 });
  const audioLevelsRef = useRef({ left: 0, right: 0 });
  
  const recognitionRef = useRef(null);
  const shouldBeListening = useRef(false);
  const mediaStream = useRef(null);
  const audioContextRef = useRef(null);

  // Synchronization and de-duplication refs
  const lastProcessedIndex = useRef(-1);
  const currentInterimRef = useRef('');
  const isCommitting = useRef(false);
  const sentenceStartTime = useRef(null);
  const pauseTimer = useRef(null);

  // Current angle tracker
  const currentAngleRef = useRef(0);

  useEffect(() => {
    const handleDirectionUpdate = (data) => {
      currentAngleRef.current = data.angle;
    };
    socket.on('direction_update', handleDirectionUpdate);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true; 
    recognition.interimResults = true;

    const channel = new BroadcastChannel('captions_channel');

    const commitCurrent = (text, speaker) => {
      if (!text.trim() || isCommitting.current) return;
      isCommitting.current = true;

      console.log(`[COMMIT] ${speaker}: ${text} at angle ${currentAngleRef.current}`);
      
      const newItem = { 
        text, 
        angle: currentAngleRef.current, 
        speaker 
      };
      
      setHistory(prev => {
        const updated = [...prev, newItem];
        historyRef.current = updated;
        return updated;
      });

      channel.postMessage({ type: 'CAPTION', speaker, text, angle: currentAngleRef.current, isFinal: true });
      
      // Reset state for next sentence
      setInterimText('');
      currentInterimRef.current = '';
      sentenceStartTime.current = null;
      if (pauseTimer.current) clearTimeout(pauseTimer.current);

      // Force a hard reset of the engine to clear its buffer entirely
      try {
        recognition.abort(); // Use abort for instant stoppage
      } catch (e) {}
      
      // Unlock after a brief delay to allow engine to restart
      setTimeout(() => {
        isCommitting.current = false;
      }, 300);
    };

    recognition.onresult = (event) => {
      if (isCommitting.current) return;

      let interim = '';
      let nativeFinal = '';
      const isLeft = audioLevelsRef.current.left > audioLevelsRef.current.right;
      const currentSpeaker = isLeft ? 'Person A' : 'Person B';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          if (i > lastProcessedIndex.current) {
            nativeFinal = transcript;
            lastProcessedIndex.current = i;
          }
        } else {
          interim += transcript;
        }
      }

      // 1. Handle Native Finalization
      if (nativeFinal) {
        commitCurrent(nativeFinal, currentSpeaker);
        return;
      }

      // 2. Handle Interim Updates with Persistence
      if (interim.trim()) {
        if (!sentenceStartTime.current) sentenceStartTime.current = Date.now();
        
        if (interim.length >= currentInterimRef.current.length || interim.length > (currentInterimRef.current.length * 0.7)) {
          setInterimText(interim);
          currentInterimRef.current = interim;
          channel.postMessage({ type: 'CAPTION', speaker: currentSpeaker, text: interim, angle: currentAngleRef.current, isFinal: false });
        }

        // A. Max Length Watchdog (5s)
        if (Date.now() - sentenceStartTime.current > 5000) {
          commitCurrent(currentInterimRef.current, currentSpeaker);
          return;
        }

        // B. Pause Watchdog (1.5s)
        if (pauseTimer.current) clearTimeout(pauseTimer.current);
        pauseTimer.current = setTimeout(() => {
          if (currentInterimRef.current) {
            commitCurrent(currentInterimRef.current, currentSpeaker);
          }
        }, 1500);
      }
    };

    recognition.onend = () => {
      if (shouldBeListening.current) {
        try { 
          recognition.start(); 
          lastProcessedIndex.current = -1; // Reset indices for new session
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    
    return () => {
      socket.off('direction_update', handleDirectionUpdate);
      channel.close();
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      }
    };
  }, []);

  const start = async () => {
    shouldBeListening.current = true;
    setIsListening(true);
    try { recognitionRef.current?.start(); } catch (e) {}

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 2, echoCancellation: false } });
      mediaStream.current = stream;
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 2, 2);
      
      processor.onaudioprocess = (e) => {
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        let lMax = 0, rMax = 0;
        const interleaved = new Int16Array(left.length * 2);
        for (let i = 0; i < left.length; i++) {
          const lVal = Math.max(-1, Math.min(1, left[i]));
          const rVal = Math.max(-1, Math.min(1, right[i]));
          if (Math.abs(lVal) > lMax) lMax = Math.abs(lVal);
          if (Math.abs(rVal) > rMax) rMax = Math.abs(rVal);
          interleaved[i*2] = lVal * 0x7FFF;
          interleaved[i*2+1] = rVal * 0x7FFF;
        }
        const levels = { left: lMax, right: rMax };
        setAudioLevels(levels);
        audioLevelsRef.current = levels;
        socket.emit('audio_data', interleaved.buffer);
      };
      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (e) { console.error("Mic Capture failed:", e); }
  };

  const stop = () => {
    shouldBeListening.current = false;
    recognitionRef.current?.abort();
    mediaStream.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    setIsListening(false);
    setInterimText('');
    setAudioLevels({ left: 0, right: 0 });
    audioLevelsRef.current = { left: 0, right: 0 };
  };

  return { history, interimText, isListening, audioLevels, start, stop };
}
