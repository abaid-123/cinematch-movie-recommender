import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'

// Standard Vite + React 18 bootstrap.
// This is the only file that touches the DOM directly —
// everything else lives inside <App />.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
