import React from 'react';
import './FactoryBackground3D.css';

// --- THE 3D ENGINE ---
// This component automatically generates 3D geometry (Top, Front, Right faces)
const Block3D = ({ x, y, z = 0, w, h, d, colorClass = "color-white", topContent, frontContent, rightContent, className = "" }) => (
  <div className={`block-3d ${colorClass} ${className}`} style={{
    '--x': `${x}px`, '--y': `${y}px`, '--z': `${z}px`,
    '--w': `${w}px`, '--h': `${h}px`, '--d': `${d}px`
  }}>
    <div className="face top">{topContent}</div>
    <div className="face front">{frontContent}</div>
    <div className="face right">{rightContent}</div>
  </div>
);

const FactoryBackground3D = () => {
  return (
    <div className="factory-bg-container">
      <div className="camera-rig">
        <div className="scene-3d">
          
          {/* --- THE FLOOR --- */}
          <div className="floor-grid"></div>

          {/* --- STORAGE BOXES (Stacked at Top Left) --- */}
          <Block3D x={100} y={100} z={0} w={60} h={60} d={60} colorClass="color-slate" />
          <Block3D x={100} y={180} z={0} w={60} h={60} d={60} colorClass="color-slate" />
          {/* This box is physically stacked ON TOP of the first one (z=60) */}
          <Block3D x={100} y={100} z={60} w={60} h={60} d={60} colorClass="color-blue" topContent={<span className="file-label">.JS</span>}/>

          {/* --- THE CONVEYOR BELT --- */}
          {/* Runs horizontally across the 3D X-axis */}
          <Block3D x={0} y={440} z={0} w={1000} h={120} d={10} colorClass="color-belt" className="no-shadow" />
          
          {/* Belt tracking lines */}
          <div className="belt-track track-1"></div>
          <div className="belt-track track-2"></div>

          {/* --- THE PROCESSING MACHINE --- */}
          {/* Straddles the conveyor belt in the center */}
          <Block3D x={400} y={400} z={0} w={200} h={200} d={160} colorClass="color-machine"
            rightContent={<div className="machine-server-racks"></div>}
            frontContent={
              <div className="machine-core-wrapper">
                <div className="machine-glow"></div>
              </div>
            }
          />

          {/* --- ANIMATED FILES ON BELT --- */}
          <div className="moving-item repo delay-0">
            <Block3D x={0} y={0} z={0} w={40} h={40} d={12} colorClass="color-white" topContent={<span className="file-label">REPO</span>} />
          </div>
          <div className="moving-item repo delay-1">
            <Block3D x={0} y={0} z={0} w={40} h={40} d={12} colorClass="color-white" topContent={<span className="file-label">REPO</span>} />
          </div>

          <div className="moving-item doc delay-2">
            <Block3D x={0} y={0} z={0} w={40} h={40} d={12} colorClass="color-blue" topContent={<span className="file-label text-white">DOCS</span>} />
          </div>
          <div className="moving-item doc delay-3">
            <Block3D x={0} y={0} z={0} w={40} h={40} d={12} colorClass="color-blue" topContent={<span className="file-label text-white">DOCS</span>} />
          </div>

          {/* --- DATA TUBE (Connects Desk to Machine) --- */}
          <Block3D x={150} y={750} z={0} w={300} h={16} d={6} colorClass="color-tube" />
          <Block3D x={450} y={500} z={0} w={16} h={250} d={6} colorClass="color-tube" />
          <div className="data-pulse pulse-1"></div>
          <div className="data-pulse pulse-2"></div>

          {/* --- DEVELOPER STATION (Bottom Right) --- */}
          {/* The Desk */}
          <Block3D x={80} y={700} z={0} w={160} h={100} d={70} colorClass="color-slate" />
          
          {/* The Computer Monitor */}
          {/* We use the "Right" face (which points towards the person) for the glowing screen */}
          <Block3D x={160} y={720} z={70} w={10} h={60} d={50} colorClass="color-machine" 
            rightContent={
              <div className="monitor-screen">
                <div className="code-line w-full"></div>
                <div className="code-line w-half delay-1"></div>
                <div className="code-line w-3/4 delay-2"></div>
              </div>
            }
          />

          {/* The Developer (Minimalist Avatar) */}
          <Block3D x={240} y={730} z={0} w={40} h={40} d={90} colorClass="color-blue" />

        </div>
      </div>
    </div>
  );
};

export default FactoryBackground3D;