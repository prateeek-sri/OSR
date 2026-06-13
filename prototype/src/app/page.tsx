"use client";

import React, { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useAppState } from "@/components/Providers";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const { setUsername, setView, setTargetRole } = useAppState();
  const [localUsername, setLocalUsername] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localUsername.trim()) {
      setUsername(localUsername.trim());
      setView("skills");
      router.push("/dashboard");
    }
  };

  return (
    <div style={{ background: "#FDFDF8", color: "#111", minHeight: "100vh", width: "100%", fontFamily: "'Inter', -apple-system, sans-serif", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      {/* Top Nav */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 40px", width: "100%", maxWidth: "1600px", margin: "0 auto" }}>
        <div onClick={() => window.location.href = '/'} style={{ cursor: "pointer", fontWeight: 800, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "6px", letterSpacing: "-0.5px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
          IDR
        </div>
        <div style={{ display: "flex", gap: "64px", fontWeight: 700, fontSize: "1rem", color: "#111" }}>
          <span style={{ cursor: "pointer" }}>Learn</span>
          <span style={{ cursor: "pointer" }}>Blog</span>
          <span style={{ cursor: "pointer" }}>Pricing</span>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          {session ? (
            <>
              <button onClick={() => router.push("/dashboard")} style={{ background: "#111", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "30px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>Go to Dashboard</button>
              <button onClick={() => signOut()} style={{ background: "#B2FF59", color: "#000", border: "none", padding: "12px 28px", borderRadius: "30px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>Sign out</button>
            </>
          ) : (
            <button onClick={() => signIn("github", { callbackUrl: "/dashboard" })} style={{ background: "#B2FF59", color: "#000", border: "none", padding: "12px 28px", borderRadius: "30px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>Sign in</button>
          )}
          {!session && (
            <button onClick={() => signIn("github", { callbackUrl: "/dashboard" })} style={{ background: "#000", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "30px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.6h8l-6.4 4.8 2.4 7.6-6.4-4.8-6.4 4.8 2.4-7.6-6.4-4.8h8z"/></svg>
              Join IDR— It's free!
            </button>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "8vh", paddingBottom: "80px", width: "100%", maxWidth: "1400px", margin: "0 auto", paddingLeft: "24px", paddingRight: "24px" }}>
        <h1 style={{ fontSize: "clamp(4rem, 8vw, 8rem)", fontWeight: 900, textAlign: "center", lineHeight: 0.95, letterSpacing: "-0.04em", color: "#111", maxWidth: "1000px", marginBottom: "24px" }}>
          Bring your<br/>ideas to life.
        </h1>
        <p style={{ fontSize: "1.5rem", color: "#333", textAlign: "center", fontWeight: 500, marginBottom: "80px" }}>
          Create your career roadmap and find open source projects.
        </p>

        {/* Giant Green Container */}
        <div style={{ width: "100%", height: "400px", background: "#AEEA00", borderRadius: "48px", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Cyan blobs in corners */}
          <div style={{ position: "absolute", top: "0", left: "0", width: "150px", height: "300px", background: "#4DD0E1", borderBottomRightRadius: "150px", borderTopRightRadius: "30px" }} />
          <div style={{ position: "absolute", bottom: "-50px", left: "0", width: "200px", height: "200px", background: "#4DD0E1", borderTopRightRadius: "150px", borderTopLeftRadius: "50px", borderBottomRightRadius: "80px" }} />
          <div style={{ position: "absolute", bottom: "-120px", left: "40%", width: "400px", height: "200px", background: "#4DD0E1", borderRadius: "50% 50% 0 0" }} />
          <div style={{ position: "absolute", top: "0", right: "0", width: "100px", height: "250px", background: "#4DD0E1", borderBottomLeftRadius: "150px" }} />
          <div style={{ position: "absolute", bottom: "-20px", right: "0", width: "150px", height: "150px", background: "#4DD0E1", borderTopLeftRadius: "150px", borderBottomLeftRadius: "50px" }} />

          {/* White Input Box */}
          <form 
            onSubmit={handleSearch}
            style={{ width: "90%", maxWidth: "800px", background: "#fff", borderRadius: "24px", padding: "32px", boxShadow: "0 24px 48px rgba(0,0,0,0.05)", zIndex: 10, display: "flex", flexDirection: "column" }}
          >
            <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>Get Started</h2>
            <p style={{ fontSize: "1.1rem", color: "#666", margin: "0 0 24px 0", fontWeight: 500 }}>Enter your GitHub username to generate a roadmap.</p>
            
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <div style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}>
                  <Search size={24} />
                </div>
                <input 
                  type="text" 
                  placeholder="github username..." 
                  value={localUsername}
                  onChange={(e) => setLocalUsername(e.target.value)}
                  style={{ width: "100%", padding: "20px 20px 20px 56px", fontSize: "1.2rem", borderRadius: "16px", border: "2px solid #E5E7EB", outline: "none", fontWeight: 500, transition: "border-color 0.2s" }}
                  onFocus={e => e.currentTarget.style.borderColor = "#4DD0E1"}
                  onBlur={e => e.currentTarget.style.borderColor = "#E5E7EB"}
                />
              </div>
              <button type="submit" style={{ background: "#111", color: "#fff", border: "none", padding: "0 40px", borderRadius: "16px", fontSize: "1.2rem", fontWeight: 700, cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.02)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>
                Analyze
              </button>
            </div>
            {session && (
              <p style={{ marginTop: "16px", fontSize: "0.95rem", color: "#666", fontWeight: 500 }}>
                Or just <a href="#" onClick={(e) => { e.preventDefault(); setView("skills"); router.push("/dashboard"); }} style={{ color: "#4DD0E1", textDecoration: "underline", cursor: "pointer" }}>go to your dashboard</a> using your connected account.
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
