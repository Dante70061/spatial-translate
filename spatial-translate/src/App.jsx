import React from "react"
import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Subtitles from "./components/Subtitles"
import FileTranslator from "./components/FileTranslator"

function App() {
  return (
    <Routes>
      {/* Main page */}
      <Route
        path="/"
        element={
          <>
            <Navbar />
            <div style={{ marginTop: "100px", textAlign: "center" }}>
              <h1>Main Page</h1>
            </div>
            <FileTranslator />
          </>
        }
      />

      {/* Translate page */}
      <Route
        path="/translate"
        element={
          <>
            <Navbar />
            <Subtitles />
          </>
        }
      />
    </Routes>
  )
}

export default App
