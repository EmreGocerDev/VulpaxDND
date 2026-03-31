// Sound effect manager for button interactions
let hoverSound = null;
let clickSound = null;

const loadSounds = () => {
  try {
    hoverSound = new Audio('./assest/buttonhover1.mp3');
    clickSound = new Audio('./assest/button2.mp3');
    hoverSound.volume = 0.3;
    clickSound.volume = 0.4;
  } catch (err) {
    console.warn('Sound files not found:', err);
  }
};

const getSettings = () => {
  try {
    const s = JSON.parse(localStorage.getItem('vulpax_settings') || '{}');
    return s;
  } catch {
    return { volume: 80, sfxVolume: 70 };
  }
};

export const playHoverSound = () => {
  if (!hoverSound) loadSounds();
  if (!hoverSound) return;
  const settings = getSettings();
  const vol = ((settings.sfxVolume ?? 70) / 100) * ((settings.volume ?? 80) / 100);
  hoverSound.volume = Math.max(0, Math.min(1, vol * 0.3));
  hoverSound.currentTime = 0;
  hoverSound.play().catch(() => {});
};

export const playClickSound = () => {
  if (!clickSound) loadSounds();
  if (!clickSound) return;
  const settings = getSettings();
  const vol = ((settings.sfxVolume ?? 70) / 100) * ((settings.volume ?? 80) / 100);
  clickSound.volume = Math.max(0, Math.min(1, vol * 0.4));
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
};

// Add event listeners to all buttons
export const initButtonSounds = () => {
  const addListeners = () => {
    document.querySelectorAll('button, .btn').forEach((btn) => {
      if (btn.dataset.soundsAdded) return;
      btn.dataset.soundsAdded = 'true';
      btn.addEventListener('mouseenter', playHoverSound);
      btn.addEventListener('click', playClickSound);
    });
  };

  addListeners();
  // Re-scan periodically for dynamically added buttons
  setInterval(addListeners, 2000);
};
