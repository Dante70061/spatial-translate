from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

def create_app():
    app = Flask(__name__)
    CORS(app)

    socketio.init_app(app)
    
    from . import socket_events
    from .routes import register_routes
    register_routes(app)

    return app
