import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://spatial-translate-11.onrender.com/api/audio/');

export function useSpeechRecognition() {
  const [history, setHistory] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [audioLevels, setAudioLevels] = useState({ left: 0, right: 0 });
  const audioLevelsRef = useRef({ left: 0, right: 0 });
  
  const recognitionRef = useRef(null);
  const shouldBeListening = useRef(false);
  const mediaStream = useRef(null);
  const audioContextRef = useRef(null);

  const currentAngleRef = useRef(0);

  useEffect(() => {
    const handleDirectionUpdate = (data) => {
      setCurrentAngle(data.angle);
      currentAngleRef.current = data.angle;
    };

    socket.on('direction_update', handleDirectionUpdate);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true; // Better for fast speech
    recognition.interimResults = true;

    let silenceTimer;
    let lastProcessedIndex = -1;
    let sessionStartTime = Date.now();

    recognition.onresult = (event) => {
      if (silenceTimer) clearTimeout(silenceTimer);

      let interim = '';
      // Only process from the last known resultIndex to avoid duplicates and sluggishness
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Double check we haven't processed this index in this session
          if (i > lastProcessedIndex) {
            if (!transcript.trim()) continue;
            
            const isLeft = audioLevelsRef.current.left > audioLevelsRef.current.right;
            setHistory(prev => [...prev, { 
              text: transcript, 
              angle: isLeft ? -10 : 10,
              speaker: isLeft ? 'Person A' : 'Person B'
            }]);
            lastProcessedIndex = i;
          }
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim);

      // Force refresh only if the session is getting very long to maintain stability
      const sessionDuration = Date.now() - sessionStartTime;
      const shouldRefresh = sessionDuration > 300000; // 5 minutes instead of 30s

      if (interim.trim()) {
        silenceTimer = setTimeout(() => {
          console.log("Significant silence, finalizing...");
          recognition.stop(); 
        }, 3000); // 3 seconds instead of 1.5s
      } else if (shouldRefresh) {
        console.log("Session limit reached, refreshing engine...");
        recognition.stop();
      }
    };

    recognition.onstart = () => {
      sessionStartTime = Date.now();
      lastProcessedIndex = -1;
      console.log("Recognition session started");
    };

    recognition.onend = () => {
      if (shouldBeListening.current) {
        console.log("Restarting recognition...");
        try { recognition.start(); } catch (e) {}
      }
    };

    recognition.onend = () => {
      if (shouldBeListening.current) {
        console.log("Recognition ended, restarting...");
        try { recognition.start(); } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    
    return () => {
      socket.off('direction_update', handleDirectionUpdate);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty dependency array: run once on mount

  const start = async () => {
    shouldBeListening.current = true;
    setIsListening(true);
    
    // Start Speech Recognition FIRST
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.log("Recognition already started");
    }

    // THEN Start Raw Audio Capture for the backend angle calculation
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 2, // Request stereo specifically
          echoCancellation: false // True stereo often requires this to be false
        } 
      });
      mediaStream.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // CRITICAL: Resume AudioContext after a user gesture (the click)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 2, 2);
      
      processor.onaudioprocess = (e) => {
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        
        let lMax = 0;
        let rMax = 0;
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
    } catch (e) {
      console.error("Mic/Spatial Capture failed:", e);
    }
  };

  const stop = () => {
    shouldBeListening.current = false;
    recognitionRef.current?.stop();
    mediaStream.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    setIsListening(false);
    setInterimText('');
    setAudioLevels({ left: 0, right: 0 });
    audioLevelsRef.current = { left: 0, right: 0 };
  };

  return { history, interimText, isListening, audioLevels, start, stop };
}
