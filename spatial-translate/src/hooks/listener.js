// useSpeechRecognition.js
import { useState, useEffect, useRef } from 'react';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

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

    recognition.onerror = (event) => {
      switch (event.error) {
        case 'not-allowed':
          setError('Microphone access was denied. Please allow microphone permissions and try again.');
          break;
        case 'audio-capture':
          setError('No microphone was found. Please connect a microphone and try again.');
          break;
        case 'network':
          setError('A network error occurred. Please check your connection.');
          break;
        case 'no-speech':
          setError('No speech was detected. Please try again.');
          break;
        default:
          setError(`An error occurred: ${event.error}`);
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const start = () => {
    setError(null);
    recognitionRef.current?.start();
  };
  const stop = () => recognitionRef.current?.stop();

  return { transcript, isListening, error, start, stop };
}