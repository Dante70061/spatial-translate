from flask_socketio import emit
from . import socketio
from .services.speech_to_text_service import transcribe_chunk
from .utils.spatial_math import get_angle_relative

@socketio.on('connect')
def handle_connect():
    print("Vision Pro Connected")
    emit('status', {'data': 'Connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print("Vision Pro Disconnected")

@socketio.on('audio_data')
def handle_audio_stream(data):
    angle = get_angle_relative(data)
    
    # Always emit the direction update so the UI knows where the sound is coming from
    emit('direction_update', {'angle': angle}, broadcast=True)
    
    # Optional: Keep transcript_update if needed for other parts, 
    # but the listener hook expects direction_update for currentAngle.
    # transcript = transcribe_chunk(data) 
    # ... rest of logic ...
