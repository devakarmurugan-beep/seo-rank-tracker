import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './AuthContext'
import './index.css'

// Force WWW in production to fix OAuth domain mismatch
if (window.location.hostname === 'seoranktrackingtool.com') {
  window.location.replace('https://www.seoranktrackingtool.com' + window.location.pathname + window.location.search);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
