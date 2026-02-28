from flask_socketio import emit
from . import socketio
from .services.speech_to_text_service import transcribe_chunk

@socketio.on('connect')
def handle_connect():
    print("Vision Pro Connected")
    emit('status', {'data': 'Connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print("Vision Pro Disconnected")

@socketio.on('audio_data')
def handle_audio_stream(data):
    transcript = transcribe_chunk(data)
    if transcript:
        emit('transcript_update', {'text': transcript}, broadcast=True)
    else:
        print(f"Received audio: {len(data)} bytes")
