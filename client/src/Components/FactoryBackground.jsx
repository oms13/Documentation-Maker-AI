import React from 'react';
import './FactoryBackground.css';

const FactoryBackground = () => {
  return (
    <div className="factory-bg-container">
      <svg 
        className="factory-svg" 
        viewBox="0 0 1200 800" 
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle drop shadow for 3D depth */}
          <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#94a3b8" floodOpacity="0.15" />
          </filter>
          
          {/* Glowing effect for the machine and data */}
          <filter id="blue-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <linearGradient id="belt-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>

        {/* --- TOP LEFT: STORAGE BOXES --- */}
        <g className="storage-boxes" transform="translate(80, 80)">
          <rect x="0" y="0" width="70" height="70" rx="8" className="box-shape" filter="url(#soft-shadow)"/>
          <text x="35" y="40" className="box-label">.JS</text>
          
          <rect x="90" y="0" width="70" height="70" rx="8" className="box-shape" filter="url(#soft-shadow)"/>
          <text x="125" y="40" className="box-label">.PY</text>
          
          <rect x="45" y="90" width="70" height="70" rx="8" className="box-shape" filter="url(#soft-shadow)"/>
          <text x="80" y="130" className="box-label">.MD</text>
        </g>

        {/* --- DIAGONAL CONVEYOR BELT SYSTEM --- */}
        {/* Rotated 40 degrees exactly as shown in the skeleton */}
        <g transform="translate(600, -150) rotate(40)">
          
          {/* The Belt */}
          <rect x="0" y="0" width="1600" height="140" fill="url(#belt-grad)" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="0" y1="20" x2="1600" y2="20" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="10 10" opacity="0.5"/>
          <line x1="0" y1="120" x2="1600" y2="120" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="10 10" opacity="0.5"/>
          <text x="300" y="165" className="belt-label" transform="rotate(-40, 300, 165)">BELT</text>

          {/* Incoming Repo Files (Left Side) */}
          <g className="input-stream">
            {[0, 1, 2].map((i) => (
              <g key={`in-${i}`} className={`file-item in-item delay-${i}`}>
                <rect x="0" y="30" width="80" height="80" rx="12" className="file-shape" filter="url(#soft-shadow)"/>
                <text x="40" y="75" className="file-text">REPO</text>
                <path d="M 30 45 L 50 45 M 30 55 L 45 55" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"/>
              </g>
            ))}
          </g>

          {/* The Machine / Processing Unit */}
          <g transform="translate(500, -20)" className="machine-group">
            <rect x="0" y="0" width="220" height="180" rx="16" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" filter="url(#soft-shadow)"/>
            {/* Machine UI / Glows */}
            <rect x="20" y="20" width="180" height="140" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
            <circle cx="110" cy="90" r="30" className="machine-core" filter="url(#blue-glow)" />
            <text x="110" y="150" className="machine-label">MACHINE</text>
          </g>

          {/* Outgoing Docs (Right Side) */}
          <g className="output-stream">
            {[0, 1, 2].map((i) => (
              <g key={`out-${i}`} className={`file-item out-item delay-${i}`}>
                <rect x="750" y="30" width="80" height="80" rx="12" className="doc-shape" filter="url(#soft-shadow)"/>
                <text x="790" y="75" className="doc-text">DOCS</text>
                <path d="M 775 40 L 785 50 L 805 30" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            ))}
          </g>
        </g>

        {/* --- HORIZONTAL DATA TUBE --- */}
        {/* Connects computer to the belt securely underneath the machine */}
        <g className="data-tube-group">
          <rect x="280" y="520" width="600" height="40" rx="20" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" opacity="0.9" filter="url(#soft-shadow)"/>
          <line x1="300" y1="540" x2="860" y2="540" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="6 6" />
          
          {/* Moving Data Packets */}
          <circle cx="280" cy="540" r="8" className="data-packet p1" filter="url(#blue-glow)"/>
          <circle cx="280" cy="540" r="8" className="data-packet p2" filter="url(#blue-glow)"/>
          <circle cx="280" cy="540" r="8" className="data-packet p3" filter="url(#blue-glow)"/>

          {/* Interface Node (The 'O' at the end of the tube) */}
          <circle cx="850" cy="540" r="14" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
        </g>

        {/* --- BOTTOM LEFT: DEVELOPER & COMPUTER --- */}
        <g className="developer-station" transform="translate(80, 480)">
          {/* Tilted Computer Base */}
          <g transform="rotate(-25, 100, 80)">
            <rect x="0" y="0" width="220" height="160" rx="12" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" filter="url(#soft-shadow)"/>
            {/* Screen Content (Chat UI Simulation) */}
            <rect x="15" y="15" width="190" height="130" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
            <text x="110" y="175" className="comp-label" transform="rotate(25, 110, 175)">COMPUTER</text>
            
            {/* Animated Chat Bubbles */}
            <rect x="25" y="30" width="100" height="20" rx="10" className="chat-bubble left" />
            <rect x="95" y="60" width="100" height="20" rx="10" className="chat-bubble right" />
            <rect x="25" y="90" width="70" height="20" rx="10" className="chat-bubble left delay" />
          </g>

          {/* Minimal Person Icon */}
          <g transform="translate(20, 170)">
            <circle cx="40" cy="20" r="18" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2"/>
            <path d="M 10 70 Q 40 40 70 70 L 70 80 L 10 80 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2"/>
            <text x="40" y="100" className="person-label">PERSON</text>
          </g>
        </g>

      </svg>
    </div>
  );
};

export default FactoryBackground;