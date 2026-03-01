from flask import Blueprint, request, jsonify

audio_bp = Blueprint('audio_bp', __name__)

@audio_bp.route('/', methods=['GET'])
def index():
    return jsonify({"message": "Audio route is working"})
