// components/FileUploader.jsx
import React, { useState } from "react"

export default function FileUploader() {
  const [file, setFile] = useState(null)
  const [language, setLanguage] = useState("Spanish")
  const [result, setResult] = useState("")

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleSubmit = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("language", language)

    try {
      const response = await fetch("http://localhost:5000/translate-file", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      setResult(data.translated_text || data.error)
    } catch (err) {
      setResult("Error: " + err.message)
    }
  }

  return (
    <div style={{ marginTop: "50px", textAlign: "center" }}>
      <h2>Upload a file to translate</h2>

      {/* File input */}
      <input type="file" onChange={handleFileChange} />

      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{ marginLeft: "10px" }}
      >
        <option>Spanish</option>
        <option>French</option>
        <option>German</option>
        <option>Japanese</option>
        <option>Chinese</option>
      </select>

      <button onClick={handleSubmit} style={{ marginLeft: "10px" }}>
        Translate
      </button>

      {/* Display chosen file and language */}
      {file && (
        <div style={{ marginTop: "20px" }}>
          <p>
            <strong>File selected:</strong> {file.name}
          </p>
          <p>
            <strong>Language selected:</strong> {language}
          </p>
        </div>
      )}

      {/* Display translated result */}
      {result && (
        <div style={{ marginTop: "20px" }}>
          <h3>Translated Text</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  )
}
