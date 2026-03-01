import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './Subtitles.css';

export default function SpeakerCaption() {
  const { speakerName } = useParams();
  const [history, setHistory] = useState([]);
  const [interimText, setInterimText] = useState('');

  const speakerColor = speakerName === 'Person A' ? '#ff4da6' : '#4dff88';

  useEffect(() => {
    const channel = new BroadcastChannel('captions_channel');
    
    // Announce window is open
    channel.postMessage({ type: 'WINDOW_STATUS', speaker: speakerName, status: 'open' });

    channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'CAPTION' && data.speaker === speakerName) {
        if (data.isFinal) {
          setHistory(prev => [...prev, data.text].slice(-5));
          setInterimText('');
        } else {
          setInterimText(data.text);
        }
      } else if (data.type === 'SYNC_RESPONSE') {
        const speakerHistory = data.history
          .filter(h => h.speaker === speakerName)
          .map(h => h.text);
        setHistory(speakerHistory.slice(-5));
      } else if (data.type === 'PING') {
        // Respond to heartbeat to prove we are still open
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
    <div className="speaker-window-wrapper">
      <div className="speaker-caption-container" enable-xr="true">
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
