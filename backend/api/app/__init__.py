from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

def create_app():
    app = Flask(__name__)
    CORS(app)

    socketio.init_app(app)
    
    from . import socket_events
    from .routes.translate_file import translate_bp
    app.register_blueprint(translate_bp)

    return app
