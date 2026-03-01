import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import * as vosk from 'vosk-browser';

/* global __XR_ENV_BASE__ */
const SOCKET_URL = 'https://spatial-translate-11.onrender.com';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  secure: true
});

export function useSpeechRecognition({ passive = false } = {}) {
  const [history, setHistory] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState({ left: 0, right: 0 });

  const recognitionRef = useRef(null);
  const voskModelRef = useRef(null);
  const voskRecognizerRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStream = useRef(null);
  const shouldBeListening = useRef(false);
  const committedTextRef = useRef('');
  const currentAngleRef = useRef(0);
  const audioLevelsRef = useRef({ left: 0, right: 0 });
  const pauseTimer = useRef(null);
  const currentInterimRef = useRef('');
  const lastProcessedIndex = useRef(-1);

  const visibilityHandlerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const processorRef = useRef(null);
  
  // Persistent refs to avoid "node already created" errors
  const audioSourceNodeRef = useRef(null);
  const micSourceNodeRef = useRef(null);
  const debugAudioRef = useRef(null);

  // --- PASSIVE MODE LOGIC ---
  useEffect(() => {
    if (!passive) return;
    const channel = new BroadcastChannel('captions_channel');
    const handleMessage = (e) => {
      if (e.data.type === 'SYNC_STATE') {
        setHistory(e.data.history || []);
        setInterimText(e.data.interimText || '');
        setIsListening(e.data.isListening || false);
        setAudioLevels(e.data.audioLevels || {left:0, right:0});
      } else if (e.data.type === 'CAPTION') {
        if (e.data.isFinal) {
           setHistory(prev => [...prev, e.data].slice(-10));
           setInterimText('');
        } else {
           setInterimText(e.data.text);
        }
      }
    };
    channel.addEventListener('message', handleMessage);
    channel.postMessage({ type: 'SYNC_REQUEST' });
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [passive]);

  const broadcastState = useCallback(() => {
    if (passive) return;
    const channel = new BroadcastChannel('captions_channel');
    channel.postMessage({
      type: 'SYNC_STATE',
      history,
      interimText,
      isListening,
      audioLevels: audioLevelsRef.current
    });
    channel.close();
  }, [passive, history, interimText, isListening]);

  useEffect(() => {
    if (!passive && isListening) broadcastState();
  }, [passive, history, interimText, isListening, broadcastState]);

  const commitCurrent = (text, speaker, isFinal) => {
    if (!text.trim()) return;
    const cleanText = text.trim();
    if (isFinal) {
      const newItem = { speaker, text: cleanText, id: Date.now(), timestamp: Date.now(), angle: currentAngleRef.current, isPause: true };
      setHistory(prev => [...prev, newItem].slice(-10));
      setInterimText('');
      currentInterimRef.current = '';
      const channel = new BroadcastChannel('captions_channel');
      channel.postMessage({ type: 'CAPTION', ...newItem, isFinal: true });
      channel.close();
    } else {
      setInterimText(cleanText);
      const channel = new BroadcastChannel('captions_channel');
      channel.postMessage({ type: 'CAPTION', text: cleanText, speaker, isFinal: false });
      channel.close();
    }
  };

  const setupRecognition = (rec) => {
    rec.onresult = (event) => {
      let interim = '';
      let nativeFinal = '';
      const currentSpeaker = 'Live Captions';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          if (i > lastProcessedIndex.current) { nativeFinal = transcript; lastProcessedIndex.current = i; }
        } else interim += transcript;
      }
      if (nativeFinal) { commitCurrent(nativeFinal, currentSpeaker, true); committedTextRef.current = ''; return; }
      if (interim.trim()) {
        let displayInterim = interim;
        if (committedTextRef.current && interim.startsWith(committedTextRef.current)) {
          displayInterim = interim.substring(committedTextRef.current.length).trim();
        }
        if (displayInterim.length > 60) { commitCurrent(interim, currentSpeaker, false); return; }
        setInterimText(displayInterim);
        currentInterimRef.current = displayInterim;
        const channel = new BroadcastChannel('captions_channel');
        channel.postMessage({ type: 'CAPTION', speaker: currentSpeaker, text: displayInterim, isFinal: false });
        channel.close();
        if (pauseTimer.current) clearTimeout(pauseTimer.current);
        pauseTimer.current = setTimeout(() => { if (currentInterimRef.current) commitCurrent(interim, currentSpeaker, true); }, 1200);
      }
    };
    rec.onerror = (e) => console.error("[RECOGNITION] Error:", e.error);
    rec.onend = () => { if (shouldBeListening.current) try { rec.start(); lastProcessedIndex.current = -1; committedTextRef.current = ''; } catch (e) {} };
  };

  const initVosk = async () => {
    if (voskModelRef.current) return voskModelRef.current;
    console.log("[VOSK] Loading Local Model...");
    let baseUrl = typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : '';
    if (baseUrl && !baseUrl.endsWith('/')) baseUrl += '/';
    const modelPath = `${window.location.origin}${baseUrl}vosk-model-small-en-us-0.15.tar.gz`;
    try {
      const model = await vosk.createModel(modelPath);
      console.log("[VOSK] Model Loaded Successfully");
      voskModelRef.current = model;
      return model;
    } catch (e) { console.error("[VOSK] Model Load Failed:", e); return null; }
  };

  useEffect(() => {
    if (passive) return;
    const channel = new BroadcastChannel('captions_channel');
    channel.onmessage = (e) => { if (e.data.type === 'SYNC_REQUEST') broadcastState(); };
    const handleDirectionUpdate = (data) => { currentAngleRef.current = data.angle; };
    socket.on('direction_update', handleDirectionUpdate);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      setupRecognition(recognition);
      recognitionRef.current = recognition;
    }
    return () => {
      socket.off('direction_update', handleDirectionUpdate);
      if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.abort(); }
      if (voskRecognizerRef.current) voskRecognizerRef.current.remove();
      channel.close();
    };
  }, [passive, broadcastState]);

  const originalGUMs = useRef({});
  useEffect(() => {
    if (passive) return;
    const gums = {};
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) gums.mediaDevices = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    gums.webkit = navigator.webkitGetUserMedia ? navigator.webkitGetUserMedia.bind(navigator) : null;
    gums.moz = navigator.mozGetUserMedia ? navigator.mozGetUserMedia.bind(navigator) : null;
    gums.legacy = navigator.getUserMedia ? navigator.getUserMedia.bind(navigator) : null;
    originalGUMs.current = gums;
  }, [passive]);

  const start = async () => {
    if (passive) return;
    console.log("[LISTENER] start() called");
    shouldBeListening.current = true;
    committedTextRef.current = '';

    const isDebug = window.appLanguage === 'Debug Mode';
    const ac = window.__GLOBAL_AC__ || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    audioContextRef.current = ac;
    window.__GLOBAL_AC__ = ac; 
    
    // Disconnect previous session connections
    if (processorRef.current) processorRef.current.disconnect();
    if (audioSourceNodeRef.current) audioSourceNodeRef.current.disconnect();
    if (micSourceNodeRef.current) micSourceNodeRef.current.disconnect();

    const processor = ac.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      if (Math.random() > 0.99) { /* Keep-alive activity check */ }
      if (voskRecognizerRef.current) voskRecognizerRef.current.acceptWaveform(e.inputBuffer);
      let max = 0;
      for (let i = 0; i < input.length; i++) {
        const val = Math.abs(input[i]);
        if (val > max) max = val;
      }
      audioLevelsRef.current = { left: max, right: max };
      const interleaved = new Int16Array(input.length * 2);
      for (let i = 0; i < input.length; i++) {
        interleaved[i*2] = input[i] * 0x7FFF;
        interleaved[i*2+1] = input[i] * 0x7FFF;
      }
      socket.emit('audio_data', interleaved.buffer);
    };

    if (ac.state === 'suspended') await ac.resume().catch(() => {});

    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (shouldBeListening.current && ac.state === 'running') {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        g.gain.value = 0.000001;
        osc.connect(g); g.connect(ac.destination);
        osc.start(0); osc.stop(ac.currentTime + 0.1);
      }
    }, 5000);

    try {
      if (isDebug) {
        console.log("[DEBUG] Starting Test Audio Setup...");
        let baseUrl = typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : '';
        if (baseUrl && !baseUrl.endsWith('/')) baseUrl += '/';
        const audioPath = `${baseUrl}test_recording.m4a`;
        
        let debugAudio = debugAudioRef.current;
        if (!debugAudio) {
           debugAudio = new Audio();
           debugAudio.crossOrigin = "anonymous";
           debugAudio.loop = true;
           debugAudioRef.current = debugAudio;
        }
        
        await new Promise((resolve) => {
          const t = setTimeout(resolve, 2000);
          debugAudio.oncanplaythrough = () => { clearTimeout(t); resolve(); };
          debugAudio.onerror = resolve;
          debugAudio.src = audioPath + '?t=' + Date.now();
        });
        
        console.log("[DEBUG] Resuming AC before play...");
        await ac.resume();
        await debugAudio.play().catch(e => console.error("[DEBUG] Play failed:", e));
        
        // Re-use source node if it exists
        if (!audioSourceNodeRef.current) {
           audioSourceNodeRef.current = ac.createMediaElementSource(debugAudio);
        }
        
        audioSourceNodeRef.current.connect(ac.destination); 
        audioSourceNodeRef.current.connect(processor);
        processor.connect(ac.destination);

        setIsListening(true);
        initVosk().then(model => {
          if (model) {
            const recognizer = new model.KaldiRecognizer(16000);
            voskRecognizerRef.current = recognizer;
            recognizer.on("result", (m) => commitCurrent(m.result.text, 'Live Captions', true));
            recognizer.on("partialresult", (m) => { if (m.result.partial) commitCurrent(m.result.partial, 'Live Captions', false); });
            console.log("[VOSK] Recognizer ready");
          }
        });
      } else {
        const gum = originalGUMs.current.mediaDevices || originalGUMs.current.legacy;
        const stream = await gum({ audio: { channelCount: 2, echoCancellation: false } });
        mediaStream.current = stream;
        
        if (!micSourceNodeRef.current) {
           micSourceNodeRef.current = ac.createMediaStreamSource(stream);
        }
        
        micSourceNodeRef.current.connect(processor);
        processor.connect(ac.destination);
        
        setIsListening(true);
        if (recognitionRef.current) try { recognitionRef.current.start(); } catch (e) {}
      }
    } catch (e) { console.error("Session start failed:", e); setIsListening(false); }
  };

  const stop = () => {
    if (passive) return;
    console.log("[LISTENER] stop() called");
    shouldBeListening.current = false;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.abort(); }
    if (voskRecognizerRef.current) { voskRecognizerRef.current.remove(); voskRecognizerRef.current = null; }
    if (debugAudioRef.current) { debugAudioRef.current.pause(); debugAudioRef.current.src = ""; }
    if (mediaStream.current && mediaStream.current.getTracks) mediaStream.current.getTracks().forEach(t => t.stop());
    
    if (processorRef.current) processorRef.current.disconnect();
    if (audioSourceNodeRef.current) audioSourceNodeRef.current.disconnect();
    if (micSourceNodeRef.current) micSourceNodeRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.suspend().catch(() => {});
    
    setIsListening(false);
    setInterimText('');
    setHistory([]);
    const channel = new BroadcastChannel('captions_channel');
    channel.postMessage({ type: 'SYNC_STATE', isListening: false, history: [], interimText: '' });
    channel.close();
  };

  return { history, interimText, isListening, audioLevels, start, stop };
}
