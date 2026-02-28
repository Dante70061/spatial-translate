// useSpeechRecognition.js
import { useState, useEffect, useRef } from 'react';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + ' ';
        } else {
          interim += text;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => console.error(e.error);

    recognitionRef.current = recognition;
  }, []);

  const start = () => recognitionRef.current?.start();
  const stop = () => recognitionRef.current?.stop();

  return { transcript, isListening, start, stop };
}