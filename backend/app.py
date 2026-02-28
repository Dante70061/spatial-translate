# app.py
from flask import Flask, request, jsonify
from google import genai
import tempfile
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

@app.route("/translate-file", methods=["POST"])
def translate_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]             # Uploaded file from React
    target_language = request.form.get("language", "Spanish")

    # Save the uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Upload the temporary file to Gemini
        uploaded_file = client.files.upload(file=tmp_path)

        # Ask Gemini to translate the content
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[
                uploaded_file,
                f"Translate the text in this file to {target_language}."
            ]
        )

        return jsonify({"translated_text": response.text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
