import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Use local backend by default for development, fallback to render if needed
/* global __XR_ENV_BASE__ */
const SOCKET_URL = 'https://spatial-translate-11.onrender.com';

const socket = io(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

export function useSpeechRecognition() {
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);
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
    recognition.continuous = true; 
    recognition.interimResults = true;

    let silenceTimer;
    let lastProcessedIndex = -1;
    let sessionStartTime = Date.now();

    const channel = new BroadcastChannel('captions_channel');
    
    // Support "late joiners" by responding to sync requests
    channel.onmessage = (e) => {
      if (e.data.type === 'SYNC_REQUEST') {
        console.log("Received SYNC_REQUEST, sending history...");
        channel.postMessage({ type: 'SYNC_RESPONSE', history: historyRef.current });
      }
    };

    recognition.onresult = (event) => {
      if (silenceTimer) clearTimeout(silenceTimer);

      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isLeft = audioLevelsRef.current.left > audioLevelsRef.current.right;
        const currentSpeaker = isLeft ? 'Person A' : 'Person B';

        if (event.results[i].isFinal) {
          if (i > lastProcessedIndex) {
            if (!transcript.trim()) continue;
            
            const newItem = { 
              text: transcript, 
              angle: isLeft ? -10 : 10,
              speaker: currentSpeaker
            };

            setHistory(prev => {
              const updated = [...prev, newItem];
              historyRef.current = updated;
              return updated;
            });
            
            // Broadcast final text
            console.log(`Broadcasting FINAL for ${currentSpeaker}: ${transcript}`);
            channel.postMessage({ type: 'CAPTION', speaker: currentSpeaker, text: transcript, isFinal: true });
            
            lastProcessedIndex = i;
          }
        } else {
          interim += transcript;
          // Broadcast interim text
          if (interim.trim()) {
            console.log(`Broadcasting INTERIM for ${currentSpeaker}: ${interim}`);
            channel.postMessage({ type: 'CAPTION', speaker: currentSpeaker, text: interim, isFinal: false });
          }
        }
      }

      setInterimText(interim);

      // Force refresh only if the session is getting very long to maintain stability
      const sessionDuration = Date.now() - sessionStartTime;
      const shouldRefresh = sessionDuration > 300000; 

      if (interim.trim()) {
        silenceTimer = setTimeout(() => {
          recognition.stop(); 
        }, 5000); 
      } else if (shouldRefresh) {
        recognition.stop();
      }
    };

    recognition.onstart = () => {
      sessionStartTime = Date.now();
      lastProcessedIndex = -1;
    };

    recognition.onend = () => {
      if (shouldBeListening.current) {
        try { 
          recognition.start(); 
        } catch (e) {
          if (e.name !== 'InvalidStateError') console.error("Recognition start failed:", e);
        }
      }
    };

    recognitionRef.current = recognition;
    
    return () => {
      socket.off('direction_update', handleDirectionUpdate);
      channel.close();
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []); 

  const start = async () => {
    shouldBeListening.current = true;
    setIsListening(true);
    
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.log("Recognition already started");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 2, 
          echoCancellation: false 
        } 
      });
      mediaStream.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
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
