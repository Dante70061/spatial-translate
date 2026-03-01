import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSpeechRecognition } from '../hooks/listener.jsx';
import './Subtitles.css';

export default function SpeakerCaption() {
  const { speakerName } = useParams();

  // Speaker windows are ALWAYS passive (engine runs in Main window)
  const { history, interimText } = useSpeechRecognition({ passive: true });
  
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
          <div className="captions-content-inner">
            {/* History and Interim rendered in one stable list */}
            {history.map((line) => (
              <React.Fragment key={line.id}>
                <span className="final-text">{line.text} </span>
                {line.isPause && <br />}
              </React.Fragment>
            ))}
            {interimText && interimText.trim() && (
              <span className="interim-text" key="interim">{interimText}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
