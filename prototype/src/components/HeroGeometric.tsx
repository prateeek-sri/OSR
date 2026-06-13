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
  title1 = "Elevate",
  title2 = "Your Brand",
  description = "Scale your product with clarity, precision, and motion-led design.",
  color1 = "#3B82F6",
  color2 = "#F0F9FF",
  speed = 1,
}: HeroGeometricProps) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, background: color2 }}>
      {/* Animated geometric blobs */}
      <style>{`
        @keyframes float1 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(30px, -50px) rotate(10deg) scale(1.1); }
          66% { transform: translate(-20px, 20px) rotate(-5deg) scale(0.9); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes float2 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(-40px, 30px) rotate(-10deg) scale(1.15); }
          66% { transform: translate(20px, -20px) rotate(5deg) scale(0.85); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes float3 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          50% { transform: translate(50px, 50px) rotate(20deg) scale(1.2); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }
      `}</style>
      
      <div style={{
        position: "absolute", top: "-10%", left: "-10%", width: "50vw", height: "50vw",
        background: `radial-gradient(circle, ${color1}80 0%, transparent 70%)`,
        filter: "blur(60px)",
        animation: `float1 ${15 / speed}s ease-in-out infinite`
      }} />
      <div style={{
        position: "absolute", bottom: "-20%", right: "-10%", width: "60vw", height: "60vw",
        background: `radial-gradient(circle, ${color1}60 0%, transparent 70%)`,
        filter: "blur(80px)",
        animation: `float2 ${20 / speed}s ease-in-out infinite`
      }} />
      <div style={{
        position: "absolute", top: "20%", right: "20%", width: "30vw", height: "30vw",
        background: `radial-gradient(circle, ${color1}40 0%, transparent 70%)`,
        filter: "blur(50px)",
        animation: `float3 ${18 / speed}s ease-in-out infinite`
      }} />

      {/* Decorative Geometric Shapes */}
      <div style={{
        position: "absolute", top: "15%", left: "10%", width: "100px", height: "100px",
        border: `2px solid ${color1}40`, borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
        animation: `float2 ${25 / speed}s ease-in-out infinite`
      }} />
      <div style={{
        position: "absolute", bottom: "25%", right: "15%", width: "150px", height: "150px",
        border: `2px solid ${color1}30`, borderRadius: "50%",
        animation: `float1 ${22 / speed}s ease-in-out infinite`
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        zIndex: 1, pointerEvents: "none", padding: "24px", textAlign: "center"
      }}>
        {title1 && <h1 style={{ fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 900, color: "#111", letterSpacing: "-0.05em", lineHeight: 1 }}>{title1}</h1>}
        {title2 && <h1 style={{ fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 900, color: color1, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: "24px" }}>{title2}</h1>}
        {description && <p style={{ fontSize: "1.2rem", color: "#4B5563", maxWidth: "600px", fontWeight: 500 }}>{description}</p>}
      </div>
    </div>
  );
}
