import React, { useState } from "react"
import "./Navbar.css" 

export default function FileTranslator() {
  const [file, setFile] = useState(null)
  const [language, setLanguage] = useState("Spanish")
  const [result, setResult] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!file) return
    setIsUploading(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("language", language)

    // https://spatial-translate-11.onrender.com/api/translate/translate-file
    try {
      const response = await fetch("http://localhost:5001/api/translate/translate-file", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      setResult(data.translated_text || data.error)
    } catch (err) {
      setResult("Error: " + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <div className="translator-layout">
        <h1 className="hero-title" style={{ marginBottom: '50px' }}>File Translation</h1>

        <div className="translator-stack">
          {/* Row 1: Unified Selection and Status */}
          <div className="translator-row selection-row">
            <label className="liquid-glass-button choose-file-btn">
              <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
              {file ? "Change File" : "Choose PDF File"}
            </label>
            
            <div className={`file-status-badge ${file ? 'active' : ''}`}>
              {file ? file.name : "No file selected"}
            </div>
          </div>
          
          {/* Row 2: Language and Action */}
          <div className="translator-row action-row">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="language-select glass-select"
            >
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
              <option>Japanese</option>
              <option>Chinese</option>
            </select>

            <button 
              className={`liquid-glass-button translate-btn ${isUploading ? 'loading' : ''}`}
              onClick={handleSubmit}
              disabled={isUploading}
            >
              {isUploading ? "Translating..." : "Translate"}
            </button>
          </div>
        </div>

        {result && (
          <div className="result-glass-pane">
            <h2 style={{ marginBottom: '20px', opacity: 0.8, fontSize: '1.5rem' }}>Translation Result</h2>
            <div className="result-content-scroll">
              <p>{result}</p>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .translator-layout {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .translator-stack {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
          width: 100%;
        }
        .translator-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 25px;
          width: 100%;
        }
        .choose-file-btn {
          min-width: 260px !important;
          height: 60px !important;
          font-size: 1.1rem !important;
          border-radius: 30px !important;
        }
        .file-status-badge {
          padding: 0 30px;
          height: 60px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.4);
          font-size: 1.1rem;
          min-width: 300px;
          max-width: 400px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .file-status-badge.active {
          color: rgba(255, 255, 255, 0.65);
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
        }
        .glass-select {
          height: 60px !important;
          min-width: 240px !important;
          font-size: 1.1rem !important;
          border-radius: 20px !important;
        }
        .translate-btn {
          min-width: 240px !important;
          height: 60px !important;
          font-size: 1.1rem !important;
          border-radius: 30px !important;
        }
        .result-content-scroll {
          max-height: 350px;
          overflow-y: auto;
          line-height: 1.6;
        }
      `}} />
    </>
  )
}
