import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './Home'
import Pricing from './Pricing'
import Privacy from './Privacy'
import Terms from './Terms'

function App() {

  return (
    <Routes>
      {/* Public Marketing Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      
      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

