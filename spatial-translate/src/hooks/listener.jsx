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
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState({ left: 0, right: 0 });

  const voskModelRef = useRef(null);
  const voskRecognizerRef = useRef(null);
  const recognizerReadyRef = useRef(false);
  const audioContextRef = useRef(null);
  const mediaStream = useRef(null);
  const shouldBeListening = useRef(false);
  const currentAngleRef = useRef(0);
  const audioLevelsRef = useRef({ left: 0, right: 0 });
  const lastCommittedWordCountRef = useRef(0);

  const heartbeatRef = useRef(null);
  const processorRef = useRef(null);
  const broadcastChannelRef = useRef(null);

  const historyRef = useRef([]);
  const isListeningRef = useRef(false);

  useEffect(() => {
    historyRef.current = history;
    isListeningRef.current = isListening;
  }, [history, isListening]);

  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel('captions_channel');
    return () => { if (broadcastChannelRef.current) broadcastChannelRef.current.close(); };
  }, []);

  const broadcastState = useCallback(() => {
    if (passive || !broadcastChannelRef.current) return;
    broadcastChannelRef.current.postMessage({
      type: 'SYNC_STATE',
      history: historyRef.current,
      isListening: isListeningRef.current,
      audioLevels: audioLevelsRef.current
    });
  }, [passive]);

  useEffect(() => {
    if (!passive && isListening) broadcastState();
  }, [passive, history, isListening, broadcastState]);

  const commitCurrent = useCallback((text, speaker, isFinal) => {
    const rawText = (text || '').trim();
    if (!rawText) {
      if (isFinal) {
        lastCommittedWordCountRef.current = 0;
        const prev = historyRef.current;
        if (prev.length === 0 || prev[prev.length-1].isPause) return;
        const next = [...prev.slice(0, -1), { ...prev[prev.length-1], isPause: true }];
        setHistory(next);
        broadcastChannelRef.current?.postMessage({ type: 'CAPTION_BATCH', history: next });
      }
      return;
    }

    const allWords = rawText.split(/\s+/).filter(w => w.length > 0);
    const newWords = allWords.slice(lastCommittedWordCountRef.current);
    const COMMIT_SIZE = 8;
    const LOOKBACK_BUFFER = 2;

    if (isFinal || newWords.length >= (COMMIT_SIZE + LOOKBACK_BUFFER)) {
      const wordsToCommit = isFinal ? newWords : newWords.slice(0, COMMIT_SIZE);
      const commitStr = wordsToCommit.join(' ').trim();
      
      if (commitStr.length > 0) {
        const newItem = { speaker, text: commitStr, id: Date.now() + Math.random(), timestamp: Date.now(), angle: currentAngleRef.current, isPause: isFinal };
        const next = [...historyRef.current, newItem].slice(-25);
        setHistory(next);
        broadcastChannelRef.current?.postMessage({ type: 'CAPTION_BATCH', history: next });
        lastCommittedWordCountRef.current += wordsToCommit.length;
      } else if (isFinal) {
        const prev = historyRef.current;
        if (prev.length > 0 && !prev[prev.length-1].isPause) {
          const next = [...prev.slice(0, -1), { ...prev[prev.length-1], isPause: true }];
          setHistory(next);
          broadcastChannelRef.current?.postMessage({ type: 'CAPTION_BATCH', history: next });
        }
      }
      if (isFinal) lastCommittedWordCountRef.current = 0;
    }
  }, []);

  const initVosk = async () => {
    if (voskModelRef.current) return voskModelRef.current;
    let baseUrl = typeof __XR_ENV_BASE__ !== 'undefined' ? __XR_ENV_BASE__ : '';
    if (baseUrl && !baseUrl.endsWith('/')) baseUrl += '/';
    const modelPath = `${window.location.origin}${baseUrl}vosk-model-small-en-us-0.15.tar.gz`;
    try {
      const model = await vosk.createModel(modelPath);
      voskModelRef.current = model;
      return model;
    } catch (e) { return null; }
  };

  useEffect(() => {
    if (passive) {
      const handleMessage = (e) => {
        if (e.data.type === 'SYNC_STATE') {
          setHistory(e.data.history || []);
          setIsListening(e.data.isListening || false);
          setAudioLevels(e.data.audioLevels || {left:0, right:0});
        } else if (e.data.type === 'CAPTION_BATCH') {
          if (e.data.history) setHistory(e.data.history);
        }
      };
      broadcastChannelRef.current?.addEventListener('message', handleMessage);
      broadcastChannelRef.current?.postMessage({ type: 'SYNC_REQUEST' });
      return () => broadcastChannelRef.current?.removeEventListener('message', handleMessage);
    } else {
      const handleSyncRequest = (e) => { if (e.data.type === 'SYNC_REQUEST') broadcastState(); };
      broadcastChannelRef.current?.addEventListener('message', handleSyncRequest);
      const handleDirectionUpdate = (data) => { currentAngleRef.current = data.angle; };
      socket.on('direction_update', handleDirectionUpdate);
      return () => {
        socket.off('direction_update', handleDirectionUpdate);
        broadcastChannelRef.current?.removeEventListener('message', handleSyncRequest);
      };
    }
  }, [passive, broadcastState]);

  const start = async () => {
    if (passive) return;
    console.log("[LISTENER] start() - Async Engine Load");
    shouldBeListening.current = true;
    recognizerReadyRef.current = false;
    lastCommittedWordCountRef.current = 0;

    const ac = window.__GLOBAL_AC__; // Guaranteed by App.jsx click stack
    audioContextRef.current = ac;
    
    if (processorRef.current) processorRef.current.disconnect();

    const processor = ac.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    processor.onaudioprocess = (e) => {
      if (shouldBeListening.current && voskRecognizerRef.current && recognizerReadyRef.current) {
         try { voskRecognizerRef.current.acceptWaveform(e.inputBuffer); } catch (err) {}
      }
      const input = e.inputBuffer.getChannelData(0);
      let max = 0;
      for (let i = 0; i < input.length; i++) {
        const val = Math.abs(input[i]);
        if (val > max) max = val;
      }
      audioLevelsRef.current = { left: max, right: max };
      const interleaved = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) interleaved[i] = input[i] * 0x7FFF;
      socket.emit('audio_data', interleaved.buffer);
    };

    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (shouldBeListening.current && ac.state === 'running') {
        const osc = ac.createOscillator();
        const g = ac.createGain(); g.gain.value = 0.000001;
        osc.connect(g); g.connect(ac.destination);
        osc.start(0); osc.stop(ac.currentTime + 0.1);
      }
    }, 5000);

    try {
      const isDebug = window.appLanguage === 'Debug Mode';
      let sourceNode;
      if (isDebug) {
        sourceNode = window.__DEBUG_SOURCE_NODE__;
        if (!sourceNode) throw new Error("Debug source node not initialized in click stack");
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        mediaStream.current = stream;
        sourceNode = ac.createMediaStreamSource(stream);
      }

      // Connect source to processor
      sourceNode.connect(processor);
      // Processor connects to destination to ensure sound passes through (important for Debug)
      processor.connect(ac.destination);
      
      setIsListening(true);

      initVosk().then(model => {
        if (model && shouldBeListening.current) {
          const recognizer = new model.KaldiRecognizer(16000);
          recognizer.setWords(true);
          recognizer.on("result", (m) => commitCurrent(m.result.text, 'Live Captions', true));
          recognizer.on("partialresult", (m) => { if (m.result.partial) commitCurrent(m.result.partial, 'Live Captions', false); });
          voskRecognizerRef.current = recognizer;
          setTimeout(() => { if (shouldBeListening.current) recognizerReadyRef.current = true; }, 50);
        }
      });
    } catch (e) { console.error("[LISTENER] Start Critical Failure:", e); setIsListening(false); }
  };

  const stop = () => {
    if (passive) return;
    console.log("[LISTENER] stop()");
    shouldBeListening.current = false;
    recognizerReadyRef.current = false;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (voskRecognizerRef.current) { voskRecognizerRef.current.remove(); voskRecognizerRef.current = null; }
    if (window.__DEBUG_AUDIO_EL__) window.__DEBUG_AUDIO_EL__.pause();
    if (mediaStream.current) { mediaStream.current.getTracks().forEach(t => t.stop()); mediaStream.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current.onaudioprocess = null; }
    if (window.__DEBUG_SOURCE_NODE__) window.__DEBUG_SOURCE_NODE__.disconnect();
    if (audioContextRef.current) audioContextRef.current.suspend().catch(() => {});
    setIsListening(false);
    setHistory([]);
    broadcastChannelRef.current?.postMessage({ type: 'CAPTION_BATCH', history: [] });
  };

  return { history, isListening, audioLevels, start, stop };
}
