// Polyfill process.nextTick for simple-peer in browser/Electron renderer
if (typeof process === 'undefined') {
  window.process = { nextTick: (fn, ...args) => setTimeout(() => fn(...args), 0) };
} else if (typeof process.nextTick !== 'function') {
  process.nextTick = (fn, ...args) => setTimeout(() => fn(...args), 0);
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';

// Deep link handler (Electron)
if (window.electronAPI?.onDeepLink) {
  window.electronAPI.onDeepLink((url) => {
    console.log('Deep link received:', url);
    try {
      // vulpax-dnd://auth-callback#access_token=... gibi URL'leri işle
      const urlObj = new URL(url);
      if (urlObj.hash) {
        // Hash'i window.location'a set et
        window.location.hash = urlObj.hash;
      }
    } catch (err) {
      console.error('Failed to parse deep link:', err);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
