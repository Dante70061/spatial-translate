# app.py

from flask import Flask, request, jsonify
from google import genai
import os
from dotenv import load_dotenv
from flask_cors import CORS
import PyPDF2
import tempfile

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Get Gemini API key
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables.")

client = genai.Client(api_key=api_key)


@app.route("/translate-file", methods=["POST"])
def translate_file():
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
