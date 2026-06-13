"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/Providers";
import {
  User,
  Calendar,
  BookOpen,
  GitBranch,
  Star,
  ExternalLink,
  LogOut,
  ArrowLeft,
} from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { state, username, savedRepos, isRoadmapSaved, setView } = useAppState();
  const router = useRouter();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const githubUsername = session?.user?.name || "";
  const profile = state?.raw_github_metadata?.profile;
  const languages = state?.raw_github_metadata?.languages || {};
  const repos = state?.raw_github_metadata?.repositories || [];

  const totalStars = repos.reduce((acc: number, r: any) => acc + (r.stargazers_count || 0), 0);
  const totalForks = repos.reduce((acc: number, r: any) => acc + (r.forks_count || 0), 0);
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "N/A";

  const topLangs = Object.entries(languages)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 6);
  const totalBytes = Object.values(languages).reduce((a: any, b: any) => a + b, 0) || 1;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Top Bar */}
      <header style={{ height: "64px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 32px", background: "#fff", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: "#6B7280", fontSize: "0.95rem", fontWeight: 600, padding: "8px 0" }}>
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div onClick={() => window.location.href = "/"} style={{ cursor: "pointer", fontWeight: 800, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "6px", letterSpacing: "-0.5px", color: "#111827", marginRight: "16px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
            IDR
          </div>
          {session && (
            <div ref={dropdownRef} style={{ width: 32, height: 32, borderRadius: 8, background: "#8B5CF6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", position: "relative" }} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              {session.user?.image ? <img src={session.user.image} style={{width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover'}}/> : (session.user?.name?.charAt(0) || "U")}
              {isDropdownOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "#fff", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #E5E7EB", overflow: "hidden", minWidth: "160px", zIndex: 100 }}>
                  <button onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); router.push('/profile'); }} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", borderBottom: "1px solid #E5E7EB", cursor: "pointer", fontSize: "0.9rem", color: "#111827", textAlign: "left" }} onMouseOver={(e) => e.currentTarget.style.background = "#F3F4F6"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                    <User size={16} /> Profile
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); signOut(); }} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "#EF4444", textAlign: "left" }} onMouseOver={(e) => e.currentTarget.style.background = "#FEF2F2"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Profile Hero */}
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.04)", marginBottom: "32px" }}>
          {/* Cover Banner */}
          <div style={{ height: "140px", background: "linear-gradient(135deg, #1D4ED8, #7C3AED, #10B981)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"60\"><circle cx=\"30\" cy=\"30\" r=\"1.5\" fill=\"rgba(255,255,255,0.15)\"/></svg>') repeat" }} />
          </div>

          <div style={{ padding: "0 40px 40px", marginTop: "-48px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "24px", marginBottom: "24px", flexWrap: "wrap" }}>
              {/* Avatar */}
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: 96, height: 96, borderRadius: "50%", border: "4px solid #fff", objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: "50%", border: "4px solid #fff", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  <User size={40} color="#9CA3AF" />
                </div>
              )}
              <div style={{ flex: 1, paddingBottom: "4px" }}>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.5px" }}>
                  {profile?.name || githubUsername || username || "Developer"}
                </h1>
                <p style={{ color: "#6B7280", margin: "4px 0 0", fontSize: "0.95rem" }}>
                  @{username || githubUsername}
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
                <a href={`https://github.com/${username || githubUsername}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", background: "#111827", color: "#fff", padding: "10px 20px", borderRadius: "10px", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.03)"} onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> View on GitHub
                </a>
                <button onClick={() => signOut()} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FEF2F2", color: "#EF4444", padding: "10px 20px", borderRadius: "10px", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.03)"} onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}>
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p style={{ fontSize: "1rem", color: "#4B5563", lineHeight: 1.6, margin: "0 0 24px", maxWidth: "600px" }}>
                {profile.bio}
              </p>
            )}

            {/* Meta Info */}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "0.9rem", color: "#6B7280" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14} /> Joined {joinDate}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><User size={14} /> {profile?.followers || 0} followers · {profile?.following || 0} following</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
          {[
            { label: "Repositories", value: profile?.public_repos || repos.length, icon: <BookOpen size={20} color="#2563EB" />, bg: "#EFF6FF" },
            { label: "Followers", value: profile?.followers || 0, icon: <User size={20} color="#10B981" />, bg: "#ECFDF5" },
            { label: "Total Stars", value: totalStars, icon: <Star size={20} color="#F59E0B" />, bg: "#FEF3C7" },
            { label: "Total Forks", value: totalForks, icon: <GitBranch size={20} color="#8B5CF6" />, bg: "#F3E8FF" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "24px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ width: 44, height: 44, borderRadius: "12px", background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>
                  {typeof stat.value === "number" && stat.value >= 1000 ? (stat.value / 1000).toFixed(1) + "k" : stat.value}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#6B7280", fontWeight: 500 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

          {/* Languages Card */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>Top Languages</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {topLangs.map(([name, bytes]: any, i: number) => {
                const percent = Math.round((bytes / totalBytes) * 100);
                const colors = ["#2563EB", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1"];
                return (
                  <div key={name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>{name}</span>
                      <span style={{ fontSize: "0.85rem", color: "#6B7280" }}>{percent}%</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "#F3F4F6", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${percent}%`, height: "100%", background: colors[i % colors.length], borderRadius: "4px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
              {topLangs.length === 0 && <p style={{ color: "#9CA3AF", fontSize: "0.9rem" }}>No language data available. Run an analysis first.</p>}
            </div>
          </div>

          {/* Top Repos Card */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>Top Repositories</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {repos.slice(0, 5).map((repo: any) => (
                <a key={repo.id || repo.name} href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "10px", border: "1px solid #F3F4F6", textDecoration: "none", transition: "all 0.2s", background: "#FAFAFA" }} onMouseOver={(e) => { e.currentTarget.style.background = "#F3F4F6"; e.currentTarget.style.borderColor = "#E5E7EB"; }} onMouseOut={(e) => { e.currentTarget.style.background = "#FAFAFA"; e.currentTarget.style.borderColor = "#F3F4F6"; }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden", flex: 1 }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{repo.name}</span>
                    <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>{repo.language || "—"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, fontSize: "0.85rem", color: "#6B7280" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Star size={13} /> {repo.stargazers_count || 0}</span>
                    <ExternalLink size={14} color="#9CA3AF" />
                  </div>
                </a>
              ))}
              {repos.length === 0 && <p style={{ color: "#9CA3AF", fontSize: "0.9rem" }}>No repository data available. Run an analysis first.</p>}
            </div>
          </div>
        </div>

        {/* Saved Resources */}
        {(savedRepos?.length > 0 || isRoadmapSaved) && (
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "32px", marginTop: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>Saved Resources</h3>
            
            {isRoadmapSaved && state?.dynamic_roadmap && (
              <div style={{ marginBottom: savedRepos?.length > 0 ? "24px" : "0" }}>
                <div style={{ fontSize: "0.85rem", color: "#6B7280", fontWeight: 600, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Career Pipeline</div>
                <div onClick={() => { setView("roadmap"); router.push("/dashboard"); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderRadius: "12px", border: "1px solid #BFDBFE", background: "#EFF6FF", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e => e.currentTarget.style.transform="translateY(0)"}>
                  <div>
                    <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1E40AF", margin: "0 0 4px" }}>Target Role: {state?.user_context?.target_role || "Unknown"}</h4>
                    <p style={{ fontSize: "0.85rem", color: "#3B82F6", margin: 0 }}>{state.dynamic_roadmap.milestones.length} Stages • Auto-generated roadmap</p>
                  </div>
                  <div style={{ background: "#3B82F6", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600 }}>Resume Roadmap</div>
                </div>
              </div>
            )}

            {savedRepos?.length > 0 && (
              <div>
                <div style={{ fontSize: "0.85rem", color: "#6B7280", fontWeight: 600, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Open Source Projects</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {savedRepos.map(repo => (
                    <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderRadius: "12px", border: "1px solid #E5E7EB", background: "#fff", textDecoration: "none", transition: "all 0.2s" }} onMouseOver={e => { e.currentTarget.style.borderColor = "#D1D5DB"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"; }} onMouseOut={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.boxShadow = "none"; }}>
                      <div>
                        <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>{repo.full_name}</h4>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", color: "#6B7280", display: "flex", alignItems: "center", gap: "4px" }}><div style={{width: 8, height: 8, borderRadius: "50%", background: "#10B981"}}/> {repo.language || "Unknown"}</span>
                          <span style={{ fontSize: "0.8rem", color: "#6B7280", display: "flex", alignItems: "center", gap: "4px" }}><Star size={12}/> {repo.stargazers_count}</span>
                        </div>
                      </div>
                      <ExternalLink size={16} color="#9CA3AF" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Info */}
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "32px", marginTop: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>Account Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#9CA3AF", fontWeight: 500, marginBottom: "4px" }}>Signed in as</div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>{session?.user?.email || session?.user?.name || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#9CA3AF", fontWeight: 500, marginBottom: "4px" }}>Auth Provider</div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>GitHub OAuth</div>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#9CA3AF", fontWeight: 500, marginBottom: "4px" }}>Analysis Status</div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: state ? "#10B981" : "#F59E0B" }}>{state ? "Analysis Complete ✓" : "Not Analyzed"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#9CA3AF", fontWeight: 500, marginBottom: "4px" }}>Target Role</div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>{state?.user_context?.target_role || "Not Set"}</div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
