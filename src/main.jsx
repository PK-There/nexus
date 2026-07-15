import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeDeviceIdentity } from './crypto.js'

// Initialize cryptographic identity before rendering
initializeDeviceIdentity().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch(err => {
  console.error("Failed to boot app:", err);
  document.getElementById('root').innerHTML = "<h1>Failed to initialize secure storage.</h1>";
});
