// components/FileUploader.jsx
import React, { useState } from "react"

export default function FileUploader() {
  const [file, setFile] = useState(null)
  const [language, setLanguage] = useState("Spanish")

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
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
    </div>
  )
}
