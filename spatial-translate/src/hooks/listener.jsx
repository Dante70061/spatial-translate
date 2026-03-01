import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import * as vosk from 'vosk-browser';

/* global __XR_ENV_BASE__ */
const SOCKET_URL = 'https://spatial-translate-11.onrender.com';
console.log("[SOCKET] Attempting connection to:", SOCKET_URL);

const socket = io(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['polling', 'websocket'],
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

  const lastProcessedIndex = useRef(-1);
  const currentInterimRef = useRef('');
  const committedTextRef = useRef(''); 
  const lastCommittedWordCountRef = useRef(0); // RESTORED REF
  const isCommitting = useRef(false);
  const sentenceStartTime = useRef(null);
  const pauseTimer = useRef(null);

  const currentAngleRef = useRef(0);
  const voskModelRef = useRef(null);
  const voskRecognizerRef = useRef(null);

  const commitCurrent = (text, speaker, isPause = false) => {
    if (!text.trim() || isCommitting.current) return;
    isCommitting.current = true;

    let cleanText = text;
    if (committedTextRef.current && text.startsWith(committedTextRef.current)) {
      cleanText = text.substring(committedTextRef.current.length).trim();
    }
    
    if (!cleanText) {
      isCommitting.current = false;
      return;
    }

    console.log(`[COMMIT] ${speaker}: ${cleanText} (isPause: ${isPause})`);
    committedTextRef.current = text; 

    const newItem = { 
      text: cleanText, 
      angle: currentAngleRef.current, 
      speaker,
      isPause,
      id: Date.now() + Math.random(),
      timestamp: Date.now()
    };
    
    setHistory(prev => [...prev, newItem]);

    const channel = new BroadcastChannel('captions_channel');
    channel.postMessage({ 
      type: 'CAPTION', 
      speaker, 
      text: cleanText, 
      angle: currentAngleRef.current, 
      isFinal: true,
      isPause 
    });
    channel.close();
    
    setInterimText('');
    currentInterimRef.current = '';
    sentenceStartTime.current = null;
    if (pauseTimer.current) clearTimeout(pauseTimer.current);

    setTimeout(() => {
      isCommitting.current = false;
    }, 100);
  };

  const setupRecognition = (rec) => {
    rec.onstart = () => console.log("[RECOGNITION] Engine Started");
    rec.onaudiostart = () => console.log("[RECOGNITION] Audio Capture Started");
    rec.onspeechstart = () => console.log("[RECOGNITION] Speech Detected");
    rec.onresult = (event) => {
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

      if (nativeFinal) { 
        commitCurrent(nativeFinal, currentSpeaker, true); 
        committedTextRef.current = ''; 
        return; 
      }

      if (interim.trim()) {
        if (!sentenceStartTime.current) sentenceStartTime.current = Date.now();

        let displayInterim = interim;
        if (committedTextRef.current && interim.startsWith(committedTextRef.current)) {
          displayInterim = interim.substring(committedTextRef.current.length).trim();
        }

        const wordCount = displayInterim.split(/\s+/).length;
        if (displayInterim.length > 60 || wordCount > 5) {
          commitCurrent(interim, currentSpeaker, false);
          return;
        }

        if (displayInterim.length >= currentInterimRef.current.length || displayInterim.length > (currentInterimRef.current.length * 0.7)) {
          setInterimText(displayInterim);
          currentInterimRef.current = displayInterim;
          const channel = new BroadcastChannel('captions_channel');
          channel.postMessage({ type: 'CAPTION', speaker: currentSpeaker, text: displayInterim, angle: currentAngleRef.current, isFinal: false });
          channel.close();
        }
        if (pauseTimer.current) clearTimeout(pauseTimer.current);
        pauseTimer.current = setTimeout(() => {
          if (currentInterimRef.current) commitCurrent(interim, currentSpeaker, true);
        }, 1200);
      }
    };
    rec.onerror = (e) => console.error("[RECOGNITION] Error:", e.error, e.message);
    rec.onend = () => {
      if (shouldBeListening.current) {
        try { rec.start(); lastProcessedIndex.current = -1; committedTextRef.current = ''; } catch (e) {}
      }
    };
  };

  const initVosk = async () => {
    if (voskModelRef.current) return voskModelRef.current;
    console.log("[VOSK] Loading Local Model...");
    let baseUrl = typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : '';
    if (baseUrl && !baseUrl.endsWith('/')) baseUrl += '/';
    const modelPath = `${window.location.origin}${baseUrl}vosk-model-small-en-us-0.15.tar.gz`;
    try {
      const model = await vosk.createModel(modelPath);
      voskModelRef.current = model;
      return model;
    } catch (e) {
      console.error("[VOSK] Model Load Failed:", e);
      return null;
    }
  };

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
    setupRecognition(recognition);
    recognitionRef.current = recognition;
    
    return () => {
      socket.off('direction_update', handleDirectionUpdate);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      }
      if (voskRecognizerRef.current) {
        voskRecognizerRef.current.remove();
      }
    };
  }, []);

  const originalGUMs = useRef({});

  useEffect(() => {
    const gums = {};
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      gums.mediaDevices = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    }
    gums.webkit = navigator.webkitGetUserMedia ? navigator.webkitGetUserMedia.bind(navigator) : null;
    gums.moz = navigator.mozGetUserMedia ? navigator.mozGetUserMedia.bind(navigator) : null;
    gums.legacy = navigator.getUserMedia ? navigator.getUserMedia.bind(navigator) : null;
    originalGUMs.current = gums;
  }, []);

  const start = async () => {
    shouldBeListening.current = true;
    setIsListening(true);
    committedTextRef.current = '';

    const isDebug = window.appLanguage === 'Debug Mode';
    const ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    audioContextRef.current = ac;
    if (ac.state === 'suspended') await ac.resume();

    try {
      let audioSourceNode;
      let debugAudio;
      
      if (isDebug) {
        console.log("[DEBUG] Using VOSK Local STT for Debug Mode");
        let baseUrl = typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : '';
        if (baseUrl && !baseUrl.endsWith('/')) baseUrl += '/';
        const audioPath = `${baseUrl}test_recording.m4a`;
        let audioBlobUrl = null;
        try {
          const response = await fetch(audioPath);
          if (response.ok) {
            const blob = await response.blob();
            audioBlobUrl = URL.createObjectURL(blob);
          }
        } catch (fetchErr) {}

        debugAudio = new Audio();
        const audioLoadPromise = new Promise((resolve, reject) => {
          debugAudio.oncanplaythrough = resolve;
          debugAudio.onerror = () => reject(new Error("Failed to load audio"));
        });
        debugAudio.src = audioBlobUrl || (audioPath + '?t=' + Date.now());
        debugAudio.crossOrigin = "anonymous";
        debugAudio.loop = true;
        await audioLoadPromise;
        await debugAudio.play().catch(() => {});
        
        audioSourceNode = ac.createMediaElementSource(debugAudio);
        audioSourceNode.connect(ac.destination); // Standard playback

        const model = await initVosk();
        if (model) {
          const recognizer = new model.KaldiRecognizer(16000);
          voskRecognizerRef.current = recognizer;
          recognizer.on("result", (message) => {
            const result = message.result;
            if (result && result.text) {
              const currentSpeaker = (audioLevelsRef.current.left > audioLevelsRef.current.right) ? 'Person A' : 'Person B';
              commitCurrent(result.text, currentSpeaker, true);
              committedTextRef.current = '';
            }
          });
          recognizer.on("partialresult", (message) => {
            const partial = message.result.partial;
            if (partial) {
              const currentSpeaker = (audioLevelsRef.current.left > audioLevelsRef.current.right) ? 'Person A' : 'Person B';
              let displayPartial = partial;
              if (committedTextRef.current && partial.startsWith(committedTextRef.current)) {
                displayPartial = partial.substring(committedTextRef.current.length).trim();
              }
              const wordCount = displayPartial.split(/\s+/).length;
              if (displayPartial.length > 60 || wordCount > 5) {
                commitCurrent(partial, currentSpeaker, false);
                return;
              }
              setInterimText(displayPartial);
              currentInterimRef.current = displayPartial;
              const channel = new BroadcastChannel('captions_channel');
              channel.postMessage({ type: 'CAPTION', speaker: currentSpeaker, text: displayPartial, angle: currentAngleRef.current, isFinal: false });
              channel.close();
            }
          });
        }
      } else {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const normalRec = new SpeechRecognition();
        normalRec.lang = 'en-US';
        normalRec.continuous = true;
        normalRec.interimResults = true;
        setupRecognition(normalRec);
        recognitionRef.current = normalRec;
        const gum = originalGUMs.current.mediaDevices || originalGUMs.current.legacy;
        if (!gum) throw new Error("No mic access");
        const stream = await gum({ audio: { channelCount: 2, echoCancellation: false } });
        mediaStream.current = stream;
        audioSourceNode = ac.createMediaStreamSource(stream);
        try { recognitionRef.current.start(); } catch (e) {}
      }

      const processor = ac.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        if (voskRecognizerRef.current) voskRecognizerRef.current.acceptWaveform(e.inputBuffer);
        let max = 0;
        for (let i = 0; i < input.length; i++) {
          const val = Math.abs(input[i]);
          if (val > max) max = val;
        }
        setAudioLevels({ left: max, right: max });
        audioLevelsRef.current = { left: max, right: max };
        const interleaved = new Int16Array(input.length * 2);
        for (let i = 0; i < input.length; i++) {
          interleaved[i*2] = input[i] * 0x7FFF;
          interleaved[i*2+1] = input[i] * 0x7FFF;
        }
        socket.emit('audio_data', interleaved.buffer);
      };
      audioSourceNode.connect(processor);
      processor.connect(ac.destination);
      if (isDebug && debugAudio) mediaStream.current = { debugAudio };
    } catch (e) { 
      console.error("Mic Capture failed:", e); 
      shouldBeListening.current = false;
      setIsListening(false);
      const og = originalGUMs.current;
      if (navigator.mediaDevices && og.mediaDevices) navigator.mediaDevices.getUserMedia = og.mediaDevices;
    }
  };

  const stop = () => {
    shouldBeListening.current = false;
    lastCommittedWordCountRef.current = 0;
    if (recognitionRef.current) recognitionRef.current.abort();
    if (voskRecognizerRef.current) {
      voskRecognizerRef.current.remove();
      voskRecognizerRef.current = null;
    }
    const og = originalGUMs.current;
    if (navigator.mediaDevices && og.mediaDevices) navigator.mediaDevices.getUserMedia = og.mediaDevices;
    if (mediaStream.current?.debugAudio) {
      mediaStream.current.debugAudio.pause();
      if (mediaStream.current.debugAudio._blobUrl) URL.revokeObjectURL(mediaStream.current.debugAudio._blobUrl);
    }
    if (mediaStream.current && mediaStream.current.getTracks) {
      mediaStream.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close().catch(() => {});
    setIsListening(false);
    setInterimText('');
    setAudioLevels({ left: 0, right: 0 });
    audioLevelsRef.current = { left: 0, right: 0 };
  };

  return { history, interimText, isListening, audioLevels, start, stop };
}
