import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './Subtitles.css';

export default function SpeakerCaption() {
  const { speakerName } = useParams();
  const [history, setHistory] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [angle, setAngle] = useState(0);

  const speakerColor = speakerName === 'Person A' ? '#ff4da6' : '#4dff88';

  useEffect(() => {
    // Explicitly focus this window when it opens to bring it to the front
    window.focus();

    const channel = new BroadcastChannel('captions_channel');
    channel.postMessage({ type: 'WINDOW_STATUS', speaker: speakerName, status: 'open' });

    channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'CAPTION' && data.speaker === speakerName) {
        if (data.angle !== undefined) setAngle(data.angle);
        
        if (data.isFinal) {
          setHistory(prev => [...prev, data.text].slice(-3));
          setInterimText('');
        } else {
          setInterimText(data.text);
        }
        
        // Refocus on each message update
        window.focus();
      } else if (data.type === 'SYNC_RESPONSE') {
        const speakerData = data.history.filter(h => h.speaker === speakerName);
        const speakerHistory = speakerData.map(h => h.text);
        if (speakerData.length > 0) {
          const lastItem = speakerData[speakerData.length - 1];
          setAngle(lastItem.angle || 0);
        }
        setHistory(speakerHistory.slice(-3));
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
        enable-xr="true"
        style={{
          /* 
             Orbital Gaze-Centric Swing:
             1. Pivot is 1000px behind (at user's eyes)
             2. Positive angle from backend rotates Right
             3. Bubble naturally faces the user during the arc
          */
          transformOrigin: `center center -1000px`,
          transform: `rotateY(${angle}deg) translateZ(100px)`,
          position: 'relative',
          transition: 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
          transformStyle: 'preserve-3d'
        }}
      >
        <div className="speaker-header">
          <div className="speaker-dot" style={{ backgroundColor: speakerColor }}></div>
          <h2 className="speaker-label">{speakerName}</h2>
        </div>
        <div className="captions-area">
          {history.map((line, i) => (
            <div key={i} className="final-text">{line}</div>
          ))}
          {interimText && <div className="interim-text">{interimText}</div>}
        </div>
      </div>
    </div>
  );
}
