import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './Subtitles.css';

export default function SpeakerCaption() {
  const { speakerName } = useParams();
  const [history, setHistory] = useState([]);
  const [interimText, setInterimText] = useState('');

  useEffect(() => {
    const channel = new BroadcastChannel('captions_channel');
    
    channel.onmessage = (event) => {
      const data = event.data;
      console.log("SpeakerCaption received message:", data);
      
      if (data.type === 'CAPTION' && data.speaker === speakerName) {
        console.log(`Matched speaker ${speakerName}, updating text`);
        if (data.isFinal) {
          setHistory(prev => [...prev, data.text].slice(-5));
          setInterimText('');
        } else {
          setInterimText(data.text);
        }
      } else if (data.type === 'SYNC_RESPONSE') {
        // Find historical items for this speaker
        const speakerHistory = data.history
          .filter(h => h.speaker === speakerName)
          .map(h => h.text);
        setHistory(speakerHistory.slice(-5));
      }
    };

    // Request existing history from main window
    channel.postMessage({ type: 'SYNC_REQUEST' });

    return () => {
      channel.close();
    };
  }, [speakerName]);

  return (
    <div className="speaker-caption-container" enable-xr="true">
      <div className="speaker-label" style={{ 
        color: speakerName === 'Person A' ? '#ff4da6' : '#4dff88',
        fontWeight: 'bold'
      }}>
        {speakerName}
      </div>
      <div className="captions-area">
        {history.map((line, i) => (
          <div key={i} className="final-text">{line}</div>
        ))}
        {interimText && <div className="interim-text">{interimText}</div>}
      </div>
    </div>
  );
}
