import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './Subtitles.css';

export default function SpeakerCaption() {
  const { speakerName } = useParams();
  const [history, setHistory] = useState([]); // Array of { text, id, timestamp, isExiting, isPause }
  const [interimText, setInterimText] = useState('');
  const [angle, setAngle] = useState(0);

  // Cleanup effect: Mark items as exiting shortly before final removal
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setHistory(prev => {
        let changed = false;
        const next = prev.map(item => {
          // Start fade out 800ms before the 7s TTL
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

    channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'CAPTION' && data.speaker === speakerName) {
        if (data.angle !== undefined) setAngle(data.angle);
        
        if (data.isFinal) {
          const newItem = {
            text: data.text,
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            isExiting: false,
            isPause: data.isPause
          };
          setHistory(prev => [...prev, newItem].slice(-10)); // Allow more history since we auto-prune
          setInterimText('');
        } else {
          setInterimText(data.text);
        }
        window.focus();
      } else if (data.type === 'SYNC_RESPONSE') {
        const speakerData = data.history.filter(h => h.speaker === speakerName);
        if (speakerData.length > 0) {
          const lastItem = speakerData[speakerData.length - 1];
          setAngle(lastItem.angle || 0);
        }
        setHistory(speakerData.map(h => ({
          text: h.text,
          id: Math.random(),
          timestamp: Date.now(),
          isExiting: false,
          isPause: h.isPause
        })).slice(-10));
      } else if (data.type === 'PING') {
        channel.postMessage({ type: 'WINDOW_STATUS', speaker: speakerName, status: 'open' });
      }
    };

    channel.postMessage({ type: 'SYNC_REQUEST' });
    return () => {
      channel.postMessage({ type: 'WINDOW_STATUS', speaker: speakerName, status: 'closed' });
      channel.close();
    };
  }, [speakerName]);

  return (
    <div className="speaker-window-wrapper" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      perspective: '2000px',
      overflow: 'visible'
    }}>
      <div 
        className="speaker-caption-container" 
        enable-xr
        style={{
          position: 'relative',
        }}
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
