import React from 'react';
import { useAudioStream } from "..hooks/AudioStream/AudioStreamer.jsx"

export default function RecorderController()
{
    const { startStream, stopStream, isRecording, transcript } = useAudioStream();

    return(
        <button onClick={isRecording ? stopStream : startStream}>
            {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
    )
}