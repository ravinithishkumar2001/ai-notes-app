import "bootstrap/dist/css/bootstrap.min.css"; // load bootstrap first
import './index.css'; // load your overrides after bootstrap
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
