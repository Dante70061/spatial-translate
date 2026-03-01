import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSpeechRecognition } from '../hooks/listener.jsx';
import './Subtitles.css';

export default function SpeakerCaption() {
  const { speakerName } = useParams(); // "Live Captions"

  // Speaker windows are ALWAYS passive (engine runs in Main window)
  const { history: sharedHistory, interimText: sharedInterim } = useSpeechRecognition({ passive: true });
  
  const [history, setHistory] = useState([]); 
  const [interimText, setInterimText] = useState('');

  // Sync internal display state with all incoming captions
  useEffect(() => {
    setHistory(sharedHistory.map(h => ({
       ...h,
       timestamp: h.timestamp || Date.now(),
       isExiting: false
    })));
  }, [sharedHistory]);

  useEffect(() => {
    setInterimText(sharedInterim);
  }, [sharedInterim]);

  // Cleanup effect: Mark items as exiting shortly before final removal
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setHistory(prev => {
        let changed = false;
        const next = prev.map(item => {
          if (!item.isExiting && (now - item.timestamp) > 6200) {
            changed = true;
            return { ...item, isExiting: true };
          }
          return item;
        }).filter(item => (now - item.timestamp) < 7000);

        return (changed || next.length !== prev.length) ? next : prev;
      });
    }, 100); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.focus();
    const channel = new BroadcastChannel('captions_channel');
    channel.postMessage({ type: 'WINDOW_STATUS', speaker: speakerName, status: 'open' });

    return () => {
      channel.postMessage({ type: 'WINDOW_STATUS', speaker: speakerName, status: 'closed' });
      channel.close();
    };
  }, [speakerName]);

  return (
    <div className="speaker-window-wrapper">
      <div 
        className="speaker-caption-container" 
        enable-xr
      >
        <div className="speaker-header">
          <div className="live-star-container">
            <div className="live-star-core"></div>
            <div className="live-star-flash"></div>
          </div>
          <h2 className="speaker-label">Live Captions</h2>
        </div>
        <div className="captions-area">
          {history.map((line) => (
            <React.Fragment key={line.id}>
              <span className={`final-text ${line.isExiting ? 'exiting' : ''}`}>{line.text} </span>
              {line.isPause && <br />}
            </React.Fragment>
          ))}
          {interimText && <span className="interim-text">{interimText}</span>}
        </div>
      </div>
    </div>
  );
}
