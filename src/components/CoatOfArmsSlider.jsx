import React from 'react';
import '../styles/coatOfArmsSlider.css';

export default function CoatOfArmsSlider() {
  // Arma dosyaları
  const coatOfArms = [
    'agnebogdir.png',
    'caelestis_axis.png',
    'drakshala.png',
    'holtrheim.png',
    'issalennia.png',
    'lunaria.png',
    'mortifodina.png',
    'tirionnel.png'
  ];

  return (
    <div className="coat-of-arms-slider">
      <div className="coat-of-arms-track">
        {/* Gidip gelen animasyon için tek set yeterli */}
        {coatOfArms.map((coat, index) => (
          <div key={index} className="coat-of-arms-item">
            <img
              src={`./assest/arma/${coat}`}
              alt={`Coat of Arms ${index}`}
            />
          </div>
        ))}
      </div>
      {/* Sol ve sağ fade efektleri */}
      <div className="coat-of-arms-fade coat-of-arms-fade-left"></div>
      <div className="coat-of-arms-fade coat-of-arms-fade-right"></div>
    </div>
  );
}
