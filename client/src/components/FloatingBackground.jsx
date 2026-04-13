// src/components/FloatingBackground.jsx
import React, { useEffect, useState } from 'react';
import './FloatingBackground.css';

// Mapped exact brand colors for each tech
const techElements = [
  { text: '.js', color: '#f7df1e' },    // Yellow
  { text: '.ts', color: '#3178c6' },    // Blue
  { text: '.jsx', color: '#61dafb' },   // Cyan
  { text: '.py', color: '#3776ab' },    // Python Blue
  { text: '.go', color: '#00add8' },    // Go Cyan
  { text: '.rs', color: '#dea584' },    // Rust Copper
  { text: '.cpp', color: '#00599c' },   // C++ Blue
  { text: '.java', color: '#b07219' },  // Java Orange
  { text: '.rb', color: '#cc342d' },    // Ruby Red
  { text: '.php', color: '#777bb4' },   // PHP Purple
  { text: '.html', color: '#e34f26' },  // HTML Orange
  { text: '.css', color: '#1572b6' },   // CSS Blue
  { text: '.json', color: '#eab308' },  // Yellow
  { text: '.yml', color: '#ef4444' },   // Red
  { text: '.md', color: '#f3f4f6' },    // White
  { text: '</>', color: '#71717a' },    // Gray
  { text: '{}', color: '#71717a' },
  { text: '()', color: '#71717a' },
  { text: '[]', color: '#71717a' },
  { text: '=>', color: '#a855f7' },     // Purple Arrow
  { text: '&&', color: '#71717a' },
  { text: '||', color: '#71717a' },
  { text: '!=', color: '#ef4444' },     // Red Warning
  { text: '===', color: '#22c55e' }     // Green Success
];

export default function FloatingBackground() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Generate 45 items with their associated colors
    const generatedItems = Array.from({ length: 70 }).map((_, i) => {
      const randomTech = techElements[Math.floor(Math.random() * techElements.length)];
      return {
        id: i,
        text: randomTech.text,
        color: randomTech.color, // Attach the specific color
        left: Math.random() * 100, 
        top: Math.random() * 100,  
        floatDuration: 15 + Math.random() * 20, 
        floatDelay: Math.random() * -20, 
      };
    });
    setItems(generatedItems);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const nodes = document.querySelectorAll('.repel-item');
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const threshold = 120; 

      nodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        const nodeX = rect.left + rect.width / 2;
        const nodeY = rect.top + rect.height / 2;

        const distX = mouseX - nodeX;
        const distY = mouseY - nodeY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        // Grab the brand color we embedded in the dataset
        const brandColor = node.getAttribute('data-color');

        if (distance < threshold) {
          const force = (threshold - distance) / threshold;
          const pushX = -(distX / distance) * force * 60; 
          const pushY = -(distY / distance) * force * 60;
          
          // Light up with the specific brand color!
          node.style.transform = `translate(${pushX}px, ${pushY}px) scale(1.2)`;
          node.style.opacity = '1';
          node.style.textShadow = `0 0 15px ${brandColor}, 0 0 30px ${brandColor}`;
        } else {
          // Go back to being a faint ghost
          node.style.transform = `translate(0px, 0px) scale(1)`;
          node.style.opacity = '0.15';
          node.style.textShadow = 'none';
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="floating-canvas">
      {items.map(item => (
        <div
          key={item.id}
          className="float-wrapper"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            animation: `ambientFloat ${item.floatDuration}s ease-in-out ${item.floatDelay}s infinite alternate`
          }}
        >
          {/* We pass the color to both the CSS style and the data-color attribute for the JS engine */}
          <div 
            className="repel-item" 
            data-color={item.color}
            style={{ color: item.color }}
          >
            {item.text}
          </div>
        </div>
      ))}
    </div>
  );
}