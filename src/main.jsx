import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Diagnostic tool to detect blank screen causes
window.onerror = function (message, source, lineno, colno, error) {
  const errorMsg = `Error: ${message} at ${source}:${lineno}`;
  console.error(errorMsg);
  // Optional: show a small alert on screen for the user if it's a mobile debug
  // alert(errorMsg);
  return false;
};

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  console.error("Render error:", e);
  document.body.innerHTML = `<div style="color: white; padding: 20px;">Error al cargar la aplicación: ${e.message}</div>`;
}
