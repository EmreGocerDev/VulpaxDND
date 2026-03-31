import React, { useState, useEffect } from 'react';

export default function TitleBar() {
  const api = window.electronAPI;
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Also listen for electron fullscreen via a polling check
    const interval = setInterval(() => {
      const fs = !!document.fullscreenElement || (window.innerHeight === screen.height && window.innerWidth === screen.width);
      setIsFullscreen(fs);
    }, 1000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearInterval(interval);
    };
  }, []);

  if (isFullscreen) return null;

  return (
    <div className="title-bar">
      <span className="title-bar__title">⚔ VULPAX DND ⚔</span>
      <div className="title-bar__controls">
        <button className="title-bar__btn" onClick={() => api?.minimize()}>─</button>
        <button className="title-bar__btn" onClick={() => api?.maximize()}>□</button>
        <button className="title-bar__btn title-bar__btn--close" onClick={() => api?.close()}>✕</button>
      </div>
    </div>
  );
}
