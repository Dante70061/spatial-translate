import { useState, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'

const socket = io('http://localhost:5000')

export function useAudioStream()
{
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const mediaRecorderer = useRef(null);

    useEffect(() => {
        socket.on('transcript_update', (data) => {
            setTranscript(prev => prev + " " + data.text);
        });
        return () => socket.off('transcript_update');
    }, []);

    const startStream = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderer.current = new MediaRecorder(stream);

        mediaRecorderer.current.ondataavailable = (e) => {
            if(e.data.size > 0) socket.emit('audio_data', e.data);
        };

        mediaRecorderer.current.start(250);
        setIsRecording(true);
    };

    const stopStream = () => {
        mediaRecorderer.current.stop();
        setIsRecording(false);
    };

    return { startStream, stopStream, isRecording, transcript }
}