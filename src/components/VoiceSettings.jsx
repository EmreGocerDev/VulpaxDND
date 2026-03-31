import React, { useState } from 'react';
import { useVoiceStore } from '../stores/voiceStore';

export default function VoiceSettings() {
  const {
    audioDevices,
    outputDevices,
    selectedInputDevice,
    selectedOutputDevice,
    inputVolume,
    outputVolume,
    noiseSuppressionEnabled,
    echoCancellationEnabled,
    autoGainControlEnabled,
    setInputDevice,
    setOutputDevice,
    setInputVolume,
    setOutputVolume,
    setNoiseSuppression,
    setEchoCancellation,
    setAutoGainControl,
    toggleSettings,
  } = useVoiceStore();

  const [testingMic, setTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  // Mikrofon testi
  const testMicrophone = async () => {
    if (testingMic) {
      setTestingMic(false);
      setMicLevel(0);
      return;
    }

    setTestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedInputDevice ? { exact: selectedInputDevice } : undefined,
          noiseSuppression: noiseSuppressionEnabled,
          echoCancellation: echoCancellationEnabled,
          autoGainControl: autoGainControlEnabled,
        },
      });

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const interval = setInterval(() => {
        if (!testingMic) {
          clearInterval(interval);
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close();
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        setMicLevel(avg);
      }, 50);

      // 10 saniye sonra oto-durdur
      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        setTestingMic(false);
        setMicLevel(0);
      }, 10000);
    } catch (err) {
      console.error('[Voice] Mic test failed:', err);
      setTestingMic(false);
    }
  };

  return (
    <div className="voice-settings">
      <div className="voice-settings__header">
        <h4>⚙ Ses Ayarları</h4>
        <button className="voice-settings-close" onClick={toggleSettings}>✕</button>
      </div>

      <div className="voice-settings__body">
        {/* Giriş Cihazı (Mikrofon) */}
        <div className="voice-setting-group">
          <label className="voice-setting-label">🎤 Mikrofon</label>
          <select
            className="input"
            value={selectedInputDevice}
            onChange={(e) => setInputDevice(e.target.value)}
          >
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Mikrofon ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Mikrofon ses seviyesi */}
        <div className="voice-setting-group">
          <label className="voice-setting-label">
            Mikrofon Seviyesi: {Math.round(inputVolume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={inputVolume}
            onChange={(e) => setInputVolume(parseFloat(e.target.value))}
            className="voice-slider"
          />
        </div>

        {/* Mikrofon testi */}
        <div className="voice-setting-group">
          <button
            className={`btn btn-sm ${testingMic ? 'btn-primary' : 'btn-ghost'} w-full`}
            onClick={testMicrophone}
          >
            {testingMic ? '⏹ Testi Durdur' : '🎤 Mikrofon Testi'}
          </button>
          {testingMic && (
            <div className="mic-test-bar">
              <div
                className="mic-test-bar__fill"
                style={{ width: `${Math.min(micLevel * 100 * 3, 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Çıkış Cihazı (Hoparlör) */}
        <div className="voice-setting-group">
          <label className="voice-setting-label">🔊 Hoparlör / Kulaklık</label>
          <select
            className="input"
            value={selectedOutputDevice}
            onChange={(e) => setOutputDevice(e.target.value)}
          >
            {outputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Hoparlör ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Çıkış ses seviyesi */}
        <div className="voice-setting-group">
          <label className="voice-setting-label">
            Çıkış Seviyesi: {Math.round(outputVolume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={outputVolume}
            onChange={(e) => setOutputVolume(parseFloat(e.target.value))}
            className="voice-slider"
          />
        </div>

        <div className="divider" />

        {/* Gelişmiş ayarlar */}
        <div className="voice-setting-group">
          <label className="voice-setting-label">⚡ Gelişmiş</label>

          <label className="voice-toggle">
            <input
              type="checkbox"
              checked={noiseSuppressionEnabled}
              onChange={(e) => setNoiseSuppression(e.target.checked)}
            />
            <span className="voice-toggle__slider" />
            <span className="voice-toggle__text">Gürültü Bastırma</span>
          </label>

          <label className="voice-toggle">
            <input
              type="checkbox"
              checked={echoCancellationEnabled}
              onChange={(e) => setEchoCancellation(e.target.checked)}
            />
            <span className="voice-toggle__slider" />
            <span className="voice-toggle__text">Eko İptali</span>
          </label>

          <label className="voice-toggle">
            <input
              type="checkbox"
              checked={autoGainControlEnabled}
              onChange={(e) => setAutoGainControl(e.target.checked)}
            />
            <span className="voice-toggle__slider" />
            <span className="voice-toggle__text">Otomatik Kazanç</span>
          </label>
        </div>
      </div>
    </div>
  );
}
