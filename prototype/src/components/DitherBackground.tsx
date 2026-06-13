import React from "react";

interface DitherBackgroundProps {
  opacity?: number;
  color?: string;
}

export default function DitherBackground({ opacity = 0.05, color = "#000" }: DitherBackgroundProps) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="ditherNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope={opacity} />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" fill={color} />
        <rect width="100%" height="100%" filter="url(#ditherNoise)" />
      </svg>
    </div>
  );
}
