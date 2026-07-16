import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeDeviceIdentity } from './crypto.js'

initializeDeviceIdentity().catch(err => {
  console.warn("Crypto init failed, proceeding in fallback mode:", err);
}).finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
