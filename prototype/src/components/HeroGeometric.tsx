import React from "react";

interface HeroGeometricProps {
  title1?: string;
  title2?: string;
  description?: string;
  color1?: string;
  color2?: string;
  speed?: number;
}

export default function HeroGeometric({
  color1 = "#3B82F6",
  color2 = "#F0F9FF",
  speed = 1,
}: HeroGeometricProps) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, background: color2 }}>
      
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0 }}>
        {/* Halftone Dot Pattern */}
        <defs>
          <pattern id="halftone" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={color1} opacity="0.3" />
          </pattern>
          
          <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color1} stopOpacity="0.8" />
            <stop offset="50%" stopColor={color1} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color1} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Big Wavy Pipes using Halftone Pattern and Gradients */}
        <g opacity="0.8">
          {/* Pipe 1 */}
          <g style={{ animation: `drift1 ${3 / speed}s ease-in-out infinite alternate` }}>
            <path 
              d="M -100 -100 Q 300 100 200 500 T 500 1200" 
              fill="none" 
              stroke="url(#halftone)" 
              strokeWidth="100" 
              strokeLinecap="round" 
            />
            <path 
              d="M -100 -100 Q 300 100 200 500 T 500 1200" 
              fill="none" 
              stroke="url(#fadeGradient)" 
              strokeWidth="100" 
              strokeLinecap="round" 
              opacity="0.5"
            />
          </g>

          {/* Pipe 2 */}
          <g style={{ animation: `drift2 ${4 / speed}s ease-in-out infinite alternate` }}>
            <path 
              d="M 600 -200 Q 400 400 800 600 T 1500 1000" 
              fill="none" 
              stroke="url(#halftone)" 
              strokeWidth="140" 
              strokeLinecap="round" 
            />
            <path 
              d="M 600 -200 Q 400 400 800 600 T 1500 1000" 
              fill="none" 
              stroke="url(#fadeGradient)" 
              strokeWidth="140" 
              strokeLinecap="round" 
              opacity="0.4"
            />
          </g>

          {/* Pipe 3 */}
          <g style={{ animation: `drift3 ${3.5 / speed}s ease-in-out infinite alternate` }}>
            <path 
              d="M -200 800 Q 400 700 800 1200" 
              fill="none" 
              stroke="url(#halftone)" 
              strokeWidth="80" 
              strokeLinecap="round" 
            />
          </g>
        </g>
      </svg>
      
      {/* Soft Glow Overlays */}
      <div style={{
        position: "absolute", top: "10%", left: "20%", width: "40vw", height: "40vw",
        background: `radial-gradient(circle, ${color1}30 0%, transparent 60%)`,
        filter: "blur(40px)"
      }} />
      <div style={{
        position: "absolute", bottom: "10%", right: "10%", width: "50vw", height: "50vw",
        background: `radial-gradient(circle, ${color1}20 0%, transparent 60%)`,
        filter: "blur(60px)"
      }} />
      
      <style>{`
        @keyframes drift1 {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(15px, 20px) scale(1.02); }
        }
        @keyframes drift2 {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(-20px, 15px) scale(1.03); }
        }
        @keyframes drift3 {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(20px, -15px) scale(1.02); }
        }
      `}</style>

    </div>
  );
}
