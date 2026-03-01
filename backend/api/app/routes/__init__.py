from .audio_routes import audio_bp
from .translate_file import translate_bp

def register_routes(app):
    app.register_blueprint(audio_bp, url_prefix='/api/audio')
    app.register_blueprint(translate_bp, url_prefix='/api/translate')
