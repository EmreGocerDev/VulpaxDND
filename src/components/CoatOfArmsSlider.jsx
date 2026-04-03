import React from 'react';
import '../styles/coatOfArmsSlider.css';

export default function CoatOfArmsSlider() {
  const coatOfArms = [
    { file: 'agnebogdir.png',     name: 'Agnebogdir' },
    { file: 'caelestis_axis.png', name: 'Caelestis Axis' },
    { file: 'drakshala.png',      name: 'Drakshala' },
    { file: 'holtrheim.png',      name: 'Holtrheim' },
    { file: 'issalennia.png',     name: 'Issalennia' },
    { file: 'lunaria.png',        name: 'Lunaria' },
    { file: 'mortifodina.png',    name: 'Mortifodina' },
    { file: 'tirionnel.png',      name: 'Tirionnel' },
  ];

  return (
    <div className="coat-of-arms-slider">
      <div className="coat-of-arms-track">
        {coatOfArms.map((coat, index) => (
          <div key={index} className="coat-of-arms-item">
            <img
              src={`./assest/arma/${coat.file}`}
              alt={coat.name}
            />
            <span className="coat-of-arms-label">{coat.name}</span>
          </div>
        ))}
      </div>
      <div className="coat-of-arms-fade coat-of-arms-fade-left"></div>
      <div className="coat-of-arms-fade coat-of-arms-fade-right"></div>
    </div>
  );
}
