from flask import Blueprint, request, jsonify
from google import genai
import os
from dotenv import load_dotenv
import PyPDF2
import tempfile

# Load environment variables
load_dotenv()

translate_bp = Blueprint('translate_bp', __name__)

# Get Gemini API key
api_key = os.environ.get("GEMINI_API_KEY")

# Initialize client outside the route for better performance
client = None
if api_key:
    client = genai.Client(api_key=api_key)

@translate_bp.route("/translate-file", methods=["POST"])
def translate_file():
    if not client:
        return jsonify({"error": "GEMINI_API_KEY not found in environment variables."}), 500

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    target_language = request.form.get("language", "Spanish")

    try:
        # Save PDF temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # Extract text from PDF
        text_content = ""
        with open(tmp_path, "rb") as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                text_content += page.extract_text() or ""

        # Delete temp file
        os.remove(tmp_path)

        if not text_content.strip():
            return jsonify({"error": "Could not extract text from PDF"}), 400

        # Send extracted text to Gemini
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"Translate the following text to {target_language}:\n\n{text_content}"
        )

        return jsonify({"translated_text": response.text})

    except Exception as e:
        print("SERVER ERROR:", e)
        return jsonify({"error": str(e)}), 500
