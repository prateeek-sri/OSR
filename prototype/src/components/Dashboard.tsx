"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  GitBranch,
  Briefcase,
  Zap,
  Search,
  Target,
  BookOpen,
  Map,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  LogIn,
  User,
  Settings,
  Puzzle,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppState } from "./Providers";
import type { GlobalState, PipelineStep } from "@/lib/types";

const NAV_STEPS = [
  { id: "skills", label: "Profile" },
  { id: "gaps", label: "Skill Gaps" },
  { id: "opensource", label: "Open Source" },
  { id: "roadmap", label: "Roadmap" },
];

function SidebarLink({ active, text, onClick, disabled, icon, iconBg, iconColor }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "8px 12px", 
        border: "none", background: active ? "#F3F4F6" : "transparent",
        color: active ? "#111827" : disabled ? "#9CA3AF" : "#4B5563",
        cursor: disabled ? "not-allowed" : "pointer", textAlign: "left", fontSize: "0.95rem", fontWeight: 500,
        borderRadius: "8px", transition: "all 0.2s"
      }}
      onMouseOver={(e) => !disabled && !active && (e.currentTarget.style.background = "#F9FAFB")}
      onMouseOut={(e) => !disabled && !active && (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg || "transparent", color: iconColor || "inherit" }}>
        {icon}
      </div>
      {text}
    </button>
  );
}

const STEP_MESSAGES: Record<string, string> = {
  ingesting: "Fetching your GitHub profile data...",
  analyzing: "AI is mapping your technical skills...",
  gap_finding: "Identifying gaps for your target role...",
  matching: "Searching for open-source issues to fill gaps...",
  coaching: "Building your contribution blueprint...",
  roadmapping: "Generating your career roadmap...",
};

type AppView = "landing" | "skills" | "overview" | "gaps" | "opensource" | "roadmap";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { state, setState, username, setUsername, targetRole, setTargetRole, step, setStep, completedSteps, setCompletedSteps, error, setError, view, setView, savedRepos, setSavedRepos, isRoadmapSaved, setIsRoadmapSaved } = useAppState();
  const [activeMilestones, setActiveMilestones] = useState<Record<string, boolean | undefined>>({});
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Roadmap progression state
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
  const [startedStage, setStartedStage] = useState<number | null>(null);
  const [checkedSkills, setCheckedSkills] = useState<Record<number, Set<string>>>({});
  
  const [osProjects, setOsProjects] = useState<any[]>([]);
  const [osTimeframe, setOsTimeframe] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [osLanguage, setOsLanguage] = useState<string>("Any");
  const [osLoading, setOsLoading] = useState(false);

  const fetchTrendingOS = useCallback(async (timeframe: "daily" | "weekly" | "monthly", langOverride?: string) => {
    setOsTimeframe(timeframe);
    if (!state?.raw_github_metadata) return;
    setOsLoading(true);
    try {
      const topLang = Object.keys(state.raw_github_metadata.languages)[0] || "JavaScript";
      const targetLang = (langOverride && langOverride !== "Any") ? langOverride : (osLanguage !== "Any" ? osLanguage : topLang);
      
      const date = new Date();
      if (timeframe === "daily") date.setDate(date.getDate() - 2); // 2 days for buffer
      else if (timeframe === "weekly") date.setDate(date.getDate() - 7);
      else if (timeframe === "monthly") date.setMonth(date.getMonth() - 1);
      
      const dateString = date.toISOString().split('T')[0];
      const langQuery = targetLang === "Any" ? "" : `language:${targetLang} `;
      const q = `${langQuery}created:>${dateString}`;
      
      const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=6`);
      const data = await res.json();
      if (data.items) {
        setOsProjects(data.items);
      }
    } catch (e) {
      console.error(e);
    }
    setOsLoading(false);
  }, [state, osLanguage]);

  useEffect(() => {
    if (view === "opensource" && osProjects.length === 0) {
      fetchTrendingOS("weekly");
    }
  }, [view, osProjects.length, fetchTrendingOS]);

  const toggleMilestone = (id: string, defaultActive: boolean) => {
    setActiveMilestones(prev => {
      const current = prev[id] !== undefined ? prev[id] : defaultActive;
      return { ...prev, [id]: !current };
    });
  };

  const markComplete = useCallback((s: PipelineStep) => {
    setCompletedSteps((prev) => [...prev, s]);
  }, []);

  // Auto-fill username from GitHub session
  const githubUsername = (session as unknown as Record<string, unknown>)?.githubUsername as string || "";

  const runAnalysis = useCallback(async () => {
    const uname = username || githubUsername;
    if (!uname) return;
    setError(null);
    setState(null);
    setCompletedSteps([]);

    try {
      setStep("ingesting");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      markComplete("ingesting");
      markComplete("analyzing");
      setState(data.state);
      setStep("complete");
      setView("skills");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("error");
    }
  }, [username, githubUsername, markComplete]);

  const runGapAnalysis = useCallback(async () => {
    if (!state || !targetRole) return;
    setError(null);

    try {
      setStep("gap_finding");
      const gapRes = await fetch("/api/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, targetRole }),
      });
      const gapData = await gapRes.json();
      if (!gapRes.ok) throw new Error(gapData.error || "Gap analysis failed");
      markComplete("gap_finding");
      
      // Clear out the old roadmap if they changed roles!
      gapData.state.dynamic_roadmap = { milestones: [] };
      setState(gapData.state);

      setStep("matching");
      const matchRes = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: gapData.state }),
      });
      const matchData = await matchRes.json();
      if (!matchRes.ok) throw new Error(matchData.error || "Matchmaking failed");
      markComplete("matching");
      setState(matchData.state);

      setStep("complete");
      setView("overview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("error");
    }
  }, [state, targetRole, markComplete]);

  const runRoadmap = useCallback(async () => {
    if (!state) return;
    setError(null);
    try {
      setStep("roadmapping");
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Roadmap failed");
      markComplete("roadmapping");
      setState(data.state);
      setStep("complete");
      setView("roadmap");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("error");
    }
  }, [state, markComplete]);

  const isRunning = !["idle", "complete", "error"].includes(step);
  const isLoading = status === "loading";

  const resetAll = () => {
    setState(null);
    setStep("idle");
    setCompletedSteps([]);
    setError(null);
    setView("landing");
    setTargetRole("");
    setUsername("");
  };

  if (view === "landing") {
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
              <button onClick={() => signOut()} style={{ background: "#B2FF59", color: "#000", border: "none", padding: "12px 28px", borderRadius: "30px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>Sign out</button>
            ) : (
              <button onClick={() => signIn("github")} style={{ background: "#B2FF59", color: "#000", border: "none", padding: "12px 28px", borderRadius: "30px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>Sign in</button>
            )}
            {!session && (
              <button onClick={() => signIn("github")} style={{ background: "#000", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "30px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>
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
              onSubmit={(e) => { e.preventDefault(); runAnalysis(); }}
              style={{ width: "90%", maxWidth: "800px", background: "#fff", borderRadius: "24px", padding: "32px", boxShadow: "0 24px 48px rgba(0,0,0,0.05)", zIndex: 10, display: "flex", flexDirection: "column" }}
            >
              <input 
                type="text" 
                placeholder={session ? (githubUsername || "Enter GitHub username...") : "A github username to analyze and"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: "100%", border: "none", outline: "none", fontSize: "1.6rem", fontWeight: 500, color: "#111", background: "transparent", marginBottom: "40px", padding: 0 }}
              />
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <button type="button" style={{ width: "44px", height: "44px", borderRadius: "50%", border: "none", background: "#F5F5F5", color: "#111", fontSize: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: 300 }}>+</button>
                  <button type="button" style={{ display: "flex", alignItems: "center", gap: "8px", border: "none", background: "#FEF2F2", color: "#EF4444", padding: "0 20px", borderRadius: "24px", fontWeight: 700, cursor: "pointer", height: "44px", fontSize: "0.95rem" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                    Inspiration
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  {error && <span style={{ color: "#EF4444", fontSize: "0.9rem", fontWeight: 600, marginLeft: 12 }}>{error}</span>}
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <button type="submit" disabled={(!username && !githubUsername) || isRunning} style={{ width: "56px", height: "56px", borderRadius: "50%", border: "none", background: "#222", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: (!username && !githubUsername) ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                    {isRunning ? <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3, borderColor: "#fff", borderTopColor: "transparent" }} /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside style={{ width: "260px", background: "#FAFAFA", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid #E5E7EB" }}>
        {/* Logo Area */}
        <div style={{ height: "64px", display: "flex", alignItems: "center", padding: "0 24px", color: "#111827", borderBottom: "1px solid transparent" }}>
          <div onClick={() => window.location.href = '/'} style={{ cursor: "pointer", fontWeight: 800, fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "8px", letterSpacing: "-0.5px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
            IDR
          </div>
        </div>

        {/* Setup Progress Widget */}
        <div style={{ padding: "16px 20px", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
             <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: "#8B5CF6" }}>
               {state?.dynamic_roadmap ? "4" : state?.remediation_strategy ? "3" : state ? "2" : "1"}
             </div>
             <div>
               <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>Setup Progress</div>
               <div style={{ fontSize: "0.7rem", color: "#6B7280", fontWeight: 500 }}>{state?.dynamic_roadmap ? "Roadmap ready!" : "Build your profile"}</div>
             </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
           <SidebarLink active={view==="skills"} text="Profile Setup" onClick={() => setView("skills")} icon={<User size={16}/>} iconBg="#ECFDF5" iconColor="#10B981" />
           <SidebarLink active={view==="overview" || view==="gaps"} text="Gap Analysis" onClick={() => { if (state?.remediation_strategy) setView("overview"); }} disabled={!state?.remediation_strategy} icon={<Target size={16}/>} iconBg="#FEF3C7" iconColor="#F59E0B" />
           <SidebarLink active={view==="opensource"} text="Open Source" onClick={() => {
              if (!session) { setIsLoginModalOpen(true); return; }
              if (state) setView("opensource");
           }} disabled={!state} icon={<Search size={16}/>} iconBg="#F3E8FF" iconColor="#8B5CF6" />
           <SidebarLink active={view==="roadmap"} text="Career Roadmap" onClick={() => {
              if (!session) { setIsLoginModalOpen(true); return; }
              if (state?.dynamic_roadmap) setView("roadmap");
           }} disabled={!state?.dynamic_roadmap} icon={<Map size={16}/>} iconBg="#E0F2FE" iconColor="#0EA5E9" />
           
           <div style={{ marginTop: "24px", marginBottom: "8px", paddingLeft: "12px", fontSize: "0.75rem", color: "#9CA3AF", fontWeight: 600 }}>Preferences</div>
           <SidebarLink active={false} text="Settings" disabled={true} icon={<Settings size={16}/>} iconBg="#F3F4F6" iconColor="#6B7280" />
        </nav>
      </aside>

      {/* Main Column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }}>
        
        {/* Top Header */}
        <header style={{ height: "64px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 32px", background: "#fff", borderBottom: "1px solid #E5E7EB", zIndex: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
            {/* Search removed as requested */}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button onClick={resetAll} style={{ background: "#F3F4F6", color: "#111827", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background="#E5E7EB"} onMouseOut={e => e.currentTarget.style.background="#F3F4F6"}>
              New Analysis
            </button>
            <Clock size={18} color="#9CA3AF" style={{ cursor: "pointer" }} />
            {session ? (
              <div ref={dropdownRef} style={{ width: 32, height: 32, borderRadius: 8, background: "#8B5CF6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", position: "relative" }} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                {session.user?.image ? <img src={session.user.image} style={{width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover'}}/> : (session.user?.name?.charAt(0) || "U")}
                {isDropdownOpen && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "#fff", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #E5E7EB", overflow: "hidden", minWidth: "160px", zIndex: 100 }}>
                    <button onClick={(e) => { e.stopPropagation(); setView("skills"); setIsDropdownOpen(false); router.push('/profile'); }} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", borderBottom: "1px solid #E5E7EB", cursor: "pointer", fontSize: "0.9rem", color: "#111827", textAlign: "left" }} onMouseOver={(e) => e.currentTarget.style.background = "#F3F4F6"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                      <User size={16} /> Profile
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); signOut(); }} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "#EF4444", textAlign: "left" }} onMouseOver={(e) => e.currentTarget.style.background = "#FEF2F2"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F3F4F6", color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setIsLoginModalOpen(true)}>
                <User size={16} />
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main style={{ flex: 1, padding: "48px 64px", overflowY: "auto", position: "relative" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: "8px", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
               {view === "skills" ? `Welcome to your Dashboard, ${session?.user?.name?.split(" ")[0] || githubUsername || username || "Developer"}` :
                view === "overview" ? "Gap Analysis Results" :
                view === "opensource" ? "Open Source Matchmaker" :
                view === "roadmap" ? "Your Career Roadmap" : "Dashboard"}
            </h1>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "40px" }}>
              {view === "skills" ? "Let's set up your profile and identify your gaps." :
               view === "overview" ? "Here is a breakdown of what you need to learn." :
               view === "opensource" ? "Contribute to these projects to build your skills." :
               view === "roadmap" ? "Follow this path to land your dream role." : ""}
            </p>

            {isRunning && (
              <div className="pipeline-message" style={{ marginBottom: "24px", background: "var(--bg-elevated)", padding: "16px 24px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", color: "var(--accent)" }}>
                <div className="spinner" style={{ borderColor: "var(--accent)", borderTopColor: "transparent", width: 20, height: 20, borderWidth: 2 }} />
                <span style={{ fontWeight: 600 }}>{STEP_MESSAGES[step] || "Processing..."}</span>
              </div>
            )}

            {error && (
              <div className="error-banner fade-in" style={{ marginBottom: "24px" }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            {/* ═══ SKELETON LOADER ═══ */}
      {isRunning && (
        <div className="fade-in" style={{ padding: "24px 0", width: "100%", display: "flex", flexDirection: "column", gap: "24px", opacity: 0.7 }}>
          <div className="skeleton-pulse" style={{ height: "140px", borderRadius: "16px", background: "var(--bg-elevated)" }} />
          <div style={{ display: "flex", gap: "24px", flexDirection: "row", flexWrap: "wrap" }}>
            <div className="skeleton-pulse" style={{ flex: 1, minWidth: "300px", height: "240px", borderRadius: "16px", background: "var(--bg-elevated)" }} />
            <div className="skeleton-pulse" style={{ flex: 2, minWidth: "300px", height: "240px", borderRadius: "16px", background: "var(--bg-elevated)" }} />
          </div>
          <div className="skeleton-pulse" style={{ height: "300px", borderRadius: "16px", background: "var(--bg-elevated)" }} />
        </div>
      )}



      {/* ═══ SKILLS VIEW (Profile Setup) ═══ */}
      {view === "skills" && state && !isRunning && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1000px", margin: "0 auto" }}>
          
          {/* Top Row: User Profile & Language Breakdown */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            
            {/* User Profile Card */}
            <div style={{ flex: "1 1 400px", background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "24px", display: "flex", alignItems: "center", gap: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              {state.raw_github_metadata.profile?.avatar_url ? (
                <img src={state.raw_github_metadata.profile.avatar_url} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover" }} alt="Avatar" />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <User size={40} color="#9CA3AF" />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{state.raw_github_metadata.profile?.name || username || githubUsername}</span>
                  <a href={`https://github.com/${username || githubUsername}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#6B7280", background: "#F3F4F6", padding: "4px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", transition: "background 0.2s", whiteSpace: "nowrap" }} onMouseOver={(e) => e.currentTarget.style.background = "#E5E7EB"} onMouseOut={(e) => e.currentTarget.style.background = "#F3F4F6"}>
                      &lt;/&gt; {username || githubUsername}
                    </span>
                  </a>
                </h2>
                <p style={{ color: "#4B5563", margin: "4px 0 0 0", fontSize: "0.95rem", lineHeight: 1.4 }}>
                  {state.raw_github_metadata.profile?.bio || "Full-stack developer. Passionate about cloud & open source."}
                </p>
              </div>
            </div>

            {/* Language Breakdown Card */}
            <div style={{ flex: "1 1 400px", background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111827", margin: "0 0 24px 0" }}>Language Breakdown</h3>
              
              <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                {Object.entries(state.raw_github_metadata.languages).length > 0 ? (
                  Object.entries(state.raw_github_metadata.languages)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([name, bytes], i) => {
                      const totalBytes = Object.values(state.raw_github_metadata.languages).reduce((a, b) => a + b, 0);
                      const percent = Math.round((bytes / totalBytes) * 100);
                      const colors = ["#2563EB", "#10B981", "#8B5CF6", "#9CA3AF"];
                      const color = colors[i % colors.length];
                      return (
                        <div key={name} style={{ flex: bytes, display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>{name}</div>
                          <div style={{ width: "100%", height: "8px", borderRadius: "4px", background: color }} />
                          <div style={{ fontSize: "0.85rem", color: "#6B7280" }}>{percent}%</div>
                        </div>
                      );
                    })
                ) : (
                  <div style={{ width: "100%", height: "8px", borderRadius: "4px", background: "#E5E7EB" }} />
                )}
              </div>
            </div>
          </div>

          {/* Middle Row: Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {/* Followers */}
            <div style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", borderRadius: "16px", border: "1px solid #BFDBFE", padding: "24px", boxShadow: "0 2px 8px rgba(37,99,235,0.08)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "12px", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#3B82F6", fontWeight: 600 }}>Followers</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1E40AF", letterSpacing: "-0.5px" }}>{(state.raw_github_metadata.profile?.followers || 0) >= 1000 ? ((state.raw_github_metadata.profile?.followers || 0) / 1000).toFixed(1) + 'k' : (state.raw_github_metadata.profile?.followers || 0)}</div>
              </div>
            </div>

            {/* Repos */}
            <div style={{ background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", borderRadius: "16px", border: "1px solid #BBF7D0", padding: "24px", boxShadow: "0 2px 8px rgba(16,185,129,0.08)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "12px", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#059669", fontWeight: 600 }}>Repositories</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#065F46", letterSpacing: "-0.5px" }}>{state.raw_github_metadata.profile?.public_repos || state.raw_github_metadata.repositories.length}</div>
              </div>
            </div>

            {/* Contributions */}
            <div style={{ background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", borderRadius: "16px", border: "1px solid #DDD6FE", padding: "24px", boxShadow: "0 2px 8px rgba(139,92,246,0.08)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "12px", background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#7C3AED", fontWeight: 600 }}>Contributions</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#5B21B6", letterSpacing: "-0.5px" }}>
                  {(state.raw_github_metadata.commit_history_insights.reduce((acc, curr) => acc + curr.total_commits, 0) || 1832) >= 1000 ? ((state.raw_github_metadata.commit_history_insights.reduce((acc, curr) => acc + curr.total_commits, 0) || 1832) / 1000).toFixed(1) + 'k' : (state.raw_github_metadata.commit_history_insights.reduce((acc, curr) => acc + curr.total_commits, 0) || 1832)}
                </div>
              </div>
            </div>

            {/* Stars */}
            <div style={{ background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)", borderRadius: "16px", border: "1px solid #FDE68A", padding: "24px", boxShadow: "0 2px 8px rgba(245,158,11,0.08)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "12px", background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Star size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#D97706", fontWeight: 600 }}>Total Stars</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#92400E", letterSpacing: "-0.5px" }}>
                  {(() => { const s = state.raw_github_metadata.repositories.reduce((a, r) => a + (r.stargazers_count || 0), 0); return s >= 1000 ? (s/1000).toFixed(1)+'k' : s; })()}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Recruitability Score — Enhanced */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
               <div>
                 <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>Recruitability Score</h3>
                 <p style={{ fontSize: "0.85rem", color: "#6B7280", margin: 0 }}>How ready are you for your next role?</p>
               </div>
               <span style={{ background: (state.analysis_results?.employability_index || 0) >= 70 ? "#ECFDF5" : (state.analysis_results?.employability_index || 0) >= 40 ? "#FEF3C7" : "#FEF2F2", color: (state.analysis_results?.employability_index || 0) >= 70 ? "#059669" : (state.analysis_results?.employability_index || 0) >= 40 ? "#D97706" : "#EF4444", padding: "6px 14px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700 }}>
                 {(state.analysis_results?.employability_index || 0) >= 70 ? "Strong" : (state.analysis_results?.employability_index || 0) >= 40 ? "Moderate" : "Needs Work"}
               </span>
             </div>
             
             <div style={{ display: "flex", gap: "48px", alignItems: "center", flexWrap: "wrap", marginBottom: "32px" }}>
               {/* Score Ring */}
               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                 <HalfScoreRing score={state.analysis_results?.employability_index || 0} size={220} strokeWidth={18} />
                 <p style={{ fontSize: "0.85rem", color: "#6B7280", textAlign: "center", lineHeight: 1.5, maxWidth: "260px", marginTop: "-12px" }}>
                   Based on code quality, commit patterns, and project diversity.
                 </p>
               </div>

               {/* Metric Bars */}
               <div style={{ flex: 1, minWidth: "300px", display: "flex", flexDirection: "column", gap: "16px" }}>
                 {[
                   { label: "Code Quality", value: 92, color: "#10B981", bg: "#ECFDF5" },
                   { label: "Commit Consistency", value: Math.min(100, Math.round((state.raw_github_metadata.commit_history_insights.length / 12) * 100) || 65), color: "#2563EB", bg: "#EFF6FF" },
                   { label: "Language Diversity", value: Math.min(100, Object.keys(state.raw_github_metadata.languages).length * 15) || 45, color: "#8B5CF6", bg: "#F5F3FF" },
                   { label: "Project Impact", value: Math.min(100, state.raw_github_metadata.repositories.reduce((a, r) => a + (r.stargazers_count || 0), 0) * 5) || 30, color: "#F59E0B", bg: "#FFFBEB" },
                 ].map(metric => (
                   <div key={metric.label}>
                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                       <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>{metric.label}</span>
                       <span style={{ fontSize: "0.85rem", fontWeight: 700, color: metric.color }}>{metric.value}%</span>
                     </div>
                     <div style={{ width: "100%", height: "10px", background: metric.bg, borderRadius: "6px", overflow: "hidden" }}>
                       <div style={{ width: `${metric.value}%`, height: "100%", background: metric.color, borderRadius: "6px", transition: "width 0.8s ease" }} />
                     </div>
                   </div>
                 ))}
               </div>
             </div>

             {/* Bottom Insight Cards */}
             <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", borderTop: "1px solid #F3F4F6", paddingTop: "24px" }}>
               <div style={{ background: "#F0FDF4", borderRadius: "12px", padding: "16px", border: "1px solid #BBF7D0" }}>
                 <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Strongest Area</div>
                 <div style={{ fontSize: "1rem", fontWeight: 700, color: "#065F46" }}>{Object.keys(state.raw_github_metadata.languages)[0] || "JavaScript"}</div>
                 <div style={{ fontSize: "0.8rem", color: "#6B7280", marginTop: "4px" }}>Your most used language by byte count</div>
               </div>
               <div style={{ background: "#EFF6FF", borderRadius: "12px", padding: "16px", border: "1px solid #BFDBFE" }}>
                 <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Active Repos</div>
                 <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1E40AF" }}>{state.raw_github_metadata.commit_history_insights.length} / {state.raw_github_metadata.repositories.length}</div>
                 <div style={{ fontSize: "0.8rem", color: "#6B7280", marginTop: "4px" }}>Repos with recent commit activity</div>
               </div>
               <div style={{ background: "#F5F3FF", borderRadius: "12px", padding: "16px", border: "1px solid #DDD6FE" }}>
                 <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Top Framework</div>
                 <div style={{ fontSize: "1rem", fontWeight: 700, color: "#5B21B6" }}>{Object.keys(state.raw_github_metadata.languages)[1] || "React"}</div>
                 <div style={{ fontSize: "0.8rem", color: "#6B7280", marginTop: "4px" }}>Second most prominent technology</div>
               </div>
             </div>
          </div>

          {/* Gap Finder Form - Smaller and professional */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
             <div>
               <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                 <Target size={18} color="#2563EB" /> Find your gaps
               </h3>
               <p style={{ fontSize: "0.85rem", color: "#6B7280", margin: 0 }}>
                 Enter your target role to identify missing skills.
               </p>
             </div>
             <form style={{ display: "flex", gap: "12px", flex: "1 1 400px" }} onSubmit={(e) => { e.preventDefault(); if (targetRole) runGapAnalysis(); }}>
               <input 
                 id="target-role" 
                 type="text"
                 placeholder="e.g. Frontend Developer"
                 value={targetRole} 
                 onChange={(e) => setTargetRole(e.target.value)} 
                 style={{ flex: 1, padding: "10px 16px", borderRadius: "8px", border: "1px solid #D1D5DB", outline: "none", fontSize: "0.95rem", color: "#111827", background: "#FAFAFA" }} 
               />
               <button 
                 onClick={runGapAnalysis} 
                 disabled={isRunning} 
                 style={{ background: "#2563EB", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", whiteSpace: "nowrap" }}
               >
                 Analyze Gaps
               </button>
             </form>
          </div>

        </div>
      )}



      {/* ═══ GAP ANALYSIS VIEW ═══ */}
      {(view === "overview" || view === "gaps") && state && !isRunning && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "100%", width: "100%", margin: "0 auto", paddingBottom: "48px" }}>
          
          {/* Header Action Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "24px 32px", borderBottom: "1px solid #E5E7EB", borderRadius: "0 0 16px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ECFDF5", padding: "6px 12px", borderRadius: "16px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#065F46" }}>Live Analysis</span>
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>Recruitability:</span>
                <span style={{ fontWeight: 800, fontSize: "1.2rem", color: state.analysis_results.employability_index >= 75 ? "#10B981" : state.analysis_results.employability_index >= 50 ? "#3B82F6" : "#F59E0B" }}>
                  {state.analysis_results.employability_index}%
                </span>
              </div>
              <button onClick={runRoadmap} disabled={isRunning || (state.dynamic_roadmap?.milestones?.length || 0) > 0} style={{ background: "#2563EB", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                {(state.dynamic_roadmap?.milestones?.length || 0) > 0 ? "Roadmap Generated" : "Generate Career Roadmap"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start", padding: "0 32px" }}>
            {/* Strengths Column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#10B981", margin: "0 0 4px 0" }}>Core Strengths</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              {Object.entries(state.analysis_results.technical_proficiency)
                .sort((a, b) => b[1].score - a[1].score)
                .slice(0, 4)
                .map(([name, data], idx) => (
                   <div key={`str-${idx}`} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #10B981", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                         <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                           <CheckCircle2 size={16} />
                         </div>
                         <span style={{ padding: "4px 16px", background: "#10B981", color: "#fff", fontSize: "0.75rem", borderRadius: "20px", fontWeight: 600 }}>Strength</span>
                      </div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", margin: "4px 0 0 0" }}>{name}</h4>
                      <p style={{ fontSize: "0.9rem", color: "#4B5563", lineHeight: 1.5, margin: 0 }}>Proficient in {name} with high recruiter signal and demonstrated capability.</p>
                   </div>
                ))}
              </div>
            </div>

            {/* Gaps Column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#529490", margin: "0 0 4px 0" }}>Identified Gaps</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {state.analysis_results.structural_gaps.map((gap, idx) => {
                 const isPriority = idx === state.analysis_results.structural_gaps.length - 1;
                 
                 if (isPriority) {
                   return (
                     <div key={`gap-${idx}`} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                       <div style={{ display: "flex", alignItems: "flex-end", borderBottom: "4px solid #529490" }}>
                          <div style={{ background: "#529490", padding: "8px 24px 8px 16px", color: "#fff", fontSize: "0.85rem", fontWeight: 600, clipPath: "polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)" }}>
                            Priority Gap
                          </div>
                       </div>
                       <div style={{ padding: "16px 20px" }}>
                         <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#111827", margin: "0 0 8px 0" }}>Top Priority: {gap.title}</h4>
                         <p style={{ fontSize: "0.9rem", color: "#4B5563", margin: 0, lineHeight: 1.5 }}>
                           AI Suggestion: {gap.description}
                         </p>
                       </div>
                     </div>
                   );
                 }

                 const gapLevels = gap.severity === "critical" ? 3 : gap.severity === "high" ? 2 : 1;
                 const yourLevelNum = gap.severity === "critical" ? 2 : 3;
                 const yourLevelText = yourLevelNum === 2 ? "Level 2: Beginner" : "Level 3: Proficient";
                 const yourPercent = yourLevelNum === 2 ? 25 : 42;
                 
                 const marketLevelNum = yourLevelNum + gapLevels;
                 const marketLevelText = marketLevelNum >= 5 ? "Level 5: Expert" : `Level ${marketLevelNum}: Advanced`;
                 const marketPercent = marketLevelNum >= 5 ? 85 : 65;

                 return (
                   <div key={`gap-${idx}`} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#E0F2F1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                             <Puzzle size={16} color="#529490" />
                           </div>
                           <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#111827", margin: 0 }}>{gap.title}</h4>
                         </div>
                         <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>
                           Gap: +{gapLevels} Levels
                         </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Your Level */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "80px", fontSize: "0.85rem", color: "#4B5563" }}>Your Level</div>
                          <div style={{ flex: 1, height: "24px", background: "#F3F4F6", borderRadius: "4px", position: "relative", display: "flex", alignItems: "center" }}>
                            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${yourPercent}%`, background: "#4B5563", borderRadius: "4px" }} />
                            <span style={{ position: "absolute", left: "8px", fontSize: "0.75rem", color: "#fff", zIndex: 1, whiteSpace: "nowrap" }}>{yourLevelText}</span>
                          </div>
                          <div style={{ width: "32px", textAlign: "right", fontSize: "0.85rem", color: "#111827", fontWeight: 500 }}>{yourPercent}%</div>
                        </div>

                        {/* Market Demand */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "80px", fontSize: "0.85rem", color: "#4B5563", lineHeight: 1.2 }}>Market Demand</div>
                          <div style={{ flex: 1, height: "24px", background: "#F3F4F6", borderRadius: "4px", position: "relative", display: "flex", alignItems: "center" }}>
                            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${marketPercent}%`, background: "#529490", borderRadius: "4px" }} />
                            <span style={{ position: "absolute", left: "8px", fontSize: "0.75rem", color: "#fff", zIndex: 1, whiteSpace: "nowrap" }}>{marketLevelText}</span>
                          </div>
                          <div style={{ width: "32px", textAlign: "right", fontSize: "0.85rem", color: "#111827", fontWeight: 500 }}>{marketPercent}%</div>
                        </div>
                      </div>
                   </div>
                 );
              })}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ═══ ROADMAP VIEW ═══ */}
      {view === "roadmap" && state && !isRunning && (
        <div className="fade-in" style={{ width: "100%", maxWidth: "1200px" }}>
          {state.dynamic_roadmap.milestones.length > 0 ? (
            <div className="premium-container fade-in" style={{ marginBottom: 32, padding: "24px", background: "var(--bg-primary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "24px 32px", borderRadius: "16px", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", marginBottom: "32px" }}>
                <div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 8px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <Map size={24} color="#3B82F6" /> Career Pipeline Flowchart
                  </h3>
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>Target: {state.user_context.target_role} • {state.dynamic_roadmap.milestones.length} Active Stages</p>
                </div>
                <button 
                  className={`btn-${isRoadmapSaved ? 'secondary' : 'primary'}`} 
                  onClick={() => setIsRoadmapSaved(!isRoadmapSaved)}
                >
                  {isRoadmapSaved ? "✓ Saved to Profile" : "Save Pipeline"}
                </button>
              </div>
              
              {state.dynamic_roadmap.overall_learning_summary && (
                <div style={{ marginBottom: 32, padding: "20px", background: "#fff", borderRadius: "12px", borderLeft: "4px solid #3B82F6", borderTop: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                    {state.dynamic_roadmap.overall_learning_summary}
                  </p>
                </div>
              )}
              
              <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "64px", padding: "24px 0", maxWidth: "900px" }}>
                {/* The central vertical line */}
                <div style={{ position: "absolute", left: "24px", top: 0, bottom: 0, width: "3px", background: "linear-gradient(to bottom, #1D4ED8, #10B981)", opacity: 0.2 }} />

                {state.dynamic_roadmap.milestones.map((m, idx) => {
                  const isCompleted = completedStages.has(idx);
                  const isUnlocked = idx === 0 || completedStages.has(idx - 1);
                  const isStarted = startedStage === idx;
                  const stageChecked = checkedSkills[idx] || new Set<string>();
                  const allSkills = m.skills_involved;
                  const allChecked = allSkills.length > 0 && allSkills.every(s => stageChecked.has(s));
                  const checkedCount = allSkills.filter(s => stageChecked.has(s)).length;
                  const progressPercent = allSkills.length > 0 ? Math.round((checkedCount / allSkills.length) * 100) : 0;

                  const nodeColor = isCompleted ? "#10B981" : isUnlocked ? "#3B82F6" : "#D1D5DB";

                  const toggleSkill = (skill: string) => {
                    setCheckedSkills(prev => {
                      const current = new Set(prev[idx] || []);
                      if (current.has(skill)) current.delete(skill); else current.add(skill);
                      return { ...prev, [idx]: current };
                    });
                  };

                  const handleComplete = () => {
                    setCompletedStages(prev => new Set([...prev, idx]));
                    setStartedStage(null);
                  };

                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: "40px", position: "relative", zIndex: 2, opacity: isUnlocked || isCompleted ? 1 : 0.5, transition: "opacity 0.3s" }}>
                      
                      {/* Node on the line */}
                      <div style={{ position: "absolute", left: "25px", top: "32px", width: "24px", height: "24px", borderRadius: "50%", background: isCompleted ? "#10B981" : "#fff", border: `4px solid ${nodeColor}`, transform: "translateX(-50%)", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isCompleted && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </div>
                      
                      {/* Branch Arrow */}
                      <div style={{ position: "absolute", left: "37px", top: "42px", width: "32px", height: "3px", background: nodeColor, zIndex: 1 }} />
                      <svg style={{ position: "absolute", left: "61px", top: "36px", color: nodeColor }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>

                      {/* The Card Wrapper */}
                      <div style={{ marginLeft: "96px", flex: 1, display: "flex", flexDirection: "column" }}>
                        {/* Floating Stage Title */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                          <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.5px" }}>{m.title}</h3>
                          {isCompleted && <span style={{ background: "#ECFDF5", color: "#059669", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700 }}>✓ Completed</span>}
                          {isStarted && !isCompleted && <span style={{ background: "#EFF6FF", color: "#2563EB", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700 }}>In Progress</span>}
                          {!isUnlocked && !isCompleted && <span style={{ background: "#F3F4F6", color: "#9CA3AF", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700 }}>🔒 Locked</span>}
                        </div>
                        
                        {/* Main Card */}
                        <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${isCompleted ? "#BBF7D0" : isStarted ? "#BFDBFE" : "#E5E7EB"}`, boxShadow: isStarted ? "0 4px 20px rgba(59,130,246,0.08)" : "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden", transition: "all 0.3s" }}>
                          
                          <div style={{ padding: "32px" }}>
                            <div style={{ fontSize: "0.85rem", color: "#6B7280", fontWeight: 600, marginBottom: "8px" }}>Stage {idx + 1}: Foundations</div>
                            <h4 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#111827", marginBottom: "24px", letterSpacing: "-0.5px" }}>{m.description?.split('.')[0] || m.title + " Fundamentals"}</h4>
                            
                            {/* Skills as pills (when not started) or checklist (when started) */}
                            {!isStarted && !isCompleted ? (
                              <div style={{ marginBottom: "24px" }}>
                                <div style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "12px" }}>Required Skills</div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                  {allSkills.slice(0, 4).map(skill => (
                                    <span key={skill} style={{ background: "#111827", color: "#F3F4F6", padding: "6px 14px", borderRadius: "24px", fontSize: "0.85rem", fontWeight: 600 }}>{skill}</span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginBottom: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                  <div style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600 }}>Skills Checklist</div>
                                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: allChecked ? "#059669" : "#3B82F6" }}>{checkedCount}/{allSkills.length} completed</span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {allSkills.map(skill => {
                                    const isChecked = stageChecked.has(skill);
                                    return (
                                      <label key={skill} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", border: `1px solid ${isChecked ? "#BBF7D0" : "#E5E7EB"}`, background: isChecked ? "#F0FDF4" : "#FAFAFA", cursor: isCompleted ? "default" : "pointer", transition: "all 0.2s", userSelect: "none" }} onClick={() => !isCompleted && toggleSkill(skill)}>
                                        <div style={{ width: 22, height: 22, borderRadius: "6px", border: `2px solid ${isChecked ? "#10B981" : "#D1D5DB"}`, background: isChecked ? "#10B981" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                                          {isChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                        </div>
                                        <span style={{ fontSize: "0.95rem", fontWeight: 600, color: isChecked ? "#065F46" : "#111827", textDecoration: isChecked ? "line-through" : "none", transition: "all 0.2s" }}>{skill}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Curated Video Courses */}
                            {m.resources && m.resources.length > 0 && (
                              <div style={{ marginBottom: "8px" }}>
                                <div style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "12px" }}>Curated Video Courses</div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
                                  {m.resources.slice(0, 3).map((res, i) => {
                                    const ytMatch = res.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                                    const ytId = ytMatch ? ytMatch[1] : null;
                                    
                                    const thumbs = [
                                      "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=300&q=80",
                                      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=300&q=80",
                                      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=300&q=80"
                                    ];
                                    const fallbackBg = thumbs[i % thumbs.length];
                                    const bgUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : fallbackBg;
                                    
                                    // if there's no real URL, fallback to search
                                    const targetUrl = (res.url && res.url.startsWith("http")) ? res.url : `https://www.youtube.com/results?search_query=${encodeURIComponent(res.title + " course")}`;

                                    return (
                                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: "12px", cursor: "pointer", transition: "transform 0.2s" }} onClick={() => window.open(targetUrl, "_blank")} onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                                        <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: "12px", background: "#000", position: "relative", overflow: "hidden" }}>
                                          <img src={bgUrl} onError={(e) => { e.currentTarget.src = fallbackBg; }} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} alt={res.title} />
                                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                                              <svg width="16" height="16" viewBox="0 0 24 24" fill="#111827"><path d="M5 3l14 9-14 9V3z"/></svg>
                                            </div>
                                          </div>
                                        </div>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#4B5563", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{res.title}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Bottom Challenge Section */}
                          <div style={{ background: isCompleted ? "#F0FDF4" : "#F9FAFB", padding: "24px 32px", borderTop: `1px solid ${isCompleted ? "#BBF7D0" : "#E5E7EB"}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: "200px" }}>
                              <div style={{ fontSize: "0.85rem", color: "#6B7280", fontWeight: 600, marginBottom: "8px" }}>
                                {isCompleted ? "Stage Complete!" : `Challenge to Unlock Level ${idx + 2}`}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                                <span style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
                                  {isCompleted ? `All ${allSkills.length} skills mastered` : `Master ${allSkills.length} skills`}
                                </span>
                                <span style={{ fontSize: "0.85rem", color: isCompleted ? "#059669" : "#6B7280", fontWeight: 600 }}>{checkedCount}/{allSkills.length}</span>
                              </div>
                              <div style={{ width: "100%", maxWidth: "240px", height: "6px", background: "#E5E7EB", borderRadius: "4px", overflow: "hidden" }}>
                                <div style={{ width: `${progressPercent}%`, height: "100%", background: isCompleted ? "#10B981" : "#3B82F6", borderRadius: "4px", transition: "width 0.4s ease" }} />
                              </div>
                            </div>
                            
                            {isCompleted ? (
                              <div style={{ background: "#10B981", color: "#fff", padding: "12px 24px", borderRadius: "24px", fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}>
                                <CheckCircle2 size={18} /> Finished
                              </div>
                            ) : isStarted ? (
                              <button onClick={handleComplete} disabled={!allChecked} style={{ background: allChecked ? "#10B981" : "#E5E7EB", color: allChecked ? "#fff" : "#9CA3AF", border: "none", padding: "12px 24px", borderRadius: "24px", fontWeight: 700, fontSize: "0.95rem", cursor: allChecked ? "pointer" : "not-allowed", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "8px" }} onMouseOver={(e) => allChecked && (e.currentTarget.style.transform = "scale(1.05)")} onMouseOut={(e) => allChecked && (e.currentTarget.style.transform = "scale(1)")}>
                                <CheckCircle2 size={18} /> {allChecked ? "Complete Stage" : "Check all skills"}
                              </button>
                            ) : (
                              <button onClick={() => isUnlocked && setStartedStage(idx)} style={{ background: isUnlocked ? "#111827" : "#E5E7EB", color: isUnlocked ? "#fff" : "#9CA3AF", border: "none", padding: "12px 24px", borderRadius: "24px", fontWeight: 700, fontSize: "0.95rem", cursor: isUnlocked ? "pointer" : "not-allowed", transition: "transform 0.2s" }} onMouseOver={(e) => isUnlocked && (e.currentTarget.style.transform = "scale(1.05)")} onMouseOut={(e) => isUnlocked && (e.currentTarget.style.transform = "scale(1)")}>
                                {isUnlocked ? "Start Challenge" : "🔒 Locked"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="premium-container fade-in" style={{ textAlign: "center", padding: "64px 24px" }}>
              <Map size={48} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
              <h3 className="premium-title">No Roadmap Generated Yet</h3>
              <p className="premium-subtitle">Head over to the Gaps page to build your AI career roadmap.</p>
              <button className="btn-primary" onClick={() => setView("gaps")}>Go to Skill Gaps</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ OPEN SOURCE FINDER VIEW ═══ */}
      {view === "opensource" && state && !isRunning && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1000px", margin: "0 auto", marginBottom: 48 }}>
          
          {/* Horizontal Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", overflowX: "auto", padding: "4px 0" }}>
             <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem", fontWeight: 600, color: "#111827", marginRight: "8px" }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
               Filters
             </div>

             {/* Language Filter */}
             <div style={{ position: "relative" }}>
               <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#111827" }}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg>
               </div>
               <select 
                 value={osLanguage} 
                 onChange={(e) => {
                   setOsLanguage(e.target.value);
                   fetchTrendingOS(osTimeframe, e.target.value);
                 }}
                 style={{ appearance: "none", background: "#E5E7EB", border: "none", borderRadius: "20px", padding: "8px 16px 8px 40px", fontSize: "0.95rem", fontWeight: 500, color: "#111827", cursor: "pointer", outline: "none", paddingRight: "32px" }}
               >
                 <option value="Any">Language</option>
                 {Object.keys(state.raw_github_metadata.languages).map(lang => (
                   <option key={lang} value={lang}>{lang}</option>
                 ))}
               </select>
             </div>
          </div>

          <div className="os-search-bar" style={{ marginBottom: "16px" }}>
            <h4 style={{ marginBottom: 8, fontSize: "0.9rem", color: "#111827" }}>Search Projects</h4>
            <div style={{ display: "flex", gap: 12 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <input className="input-field" style={{ background: "#fff", borderColor: "#E5E7EB", width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #E5E7EB", outline: "none" }} placeholder={`Search for ${Object.keys(state.raw_github_metadata.languages)[0] || 'projects'}...`} />
              </div>
              <button className="btn-secondary" style={{ background: "#F3F4F6", color: "#111827", border: "none", padding: "0 24px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}><Search size={16} /> Search</button>
            </div>
          </div>

          <h3 style={{ fontSize: "1.2rem", color: "#111827", fontWeight: 600, margin: 0 }}>Trending Projects <span style={{ color: "#6B7280", fontWeight: 400 }}>({osProjects.length})</span></h3>

          {/* Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {osLoading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#6B7280" }}>Loading latest GitHub projects...</div>
            ) : osProjects.length > 0 ? (
              osProjects.map((repo, idx) => {
                const suggestedIssues = [
                  "Fix responsive layout bugs",
                  "Improve error handling in API",
                  "Update outdated documentation",
                  "Add unit tests for core module",
                  "Refactor redundant components",
                  "Resolve dependency vulnerabilities"
                ];
                const suggestedDescriptions = [
                  "This issue involves digging into the UI CSS to resolve flexbox alignment issues on mobile viewports. Ideal for beginners.",
                  "Help improve test coverage by adding Jest unit tests to the core utility functions. Good way to learn the codebase.",
                  "The current API documentation is missing examples for the v2 endpoints. This requires updating markdown files in the /docs folder.",
                  "We need to replace the deprecated dependencies with native JavaScript array methods to reduce bundle size.",
                  "There is a minor race condition in the data-fetching hook when the component mounts twice in strict mode. Needs debugging.",
                  "Users have reported high memory usage on the dashboard. Help profile and optimize the React component re-renders."
                ];
                
                const suggestedIssue = suggestedIssues[idx % suggestedIssues.length];
                const suggestedDesc = suggestedDescriptions[idx % suggestedDescriptions.length];
                
                return (
                  <div key={repo.id} style={{ background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "24px", display: "flex", gap: "24px", alignItems: "stretch", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", flexDirection: "row", flexWrap: "wrap" }}>
                    
                    {/* Left Side: Repo Info & Stats */}
                    <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <h4 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111827", margin: "0 0 8px 0" }}>
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ color: "#111827", textDecoration: "none" }}>{repo.full_name}</a>
                      </h4>
                      
                      <p style={{ fontSize: "0.95rem", color: "#4B5563", marginBottom: "16px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {repo.description || "No description provided for this repository. It might be a collection of scripts, a personal project, or still under early development."}
                      </p>
                      
                      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                        <span style={{ background: "#1D4ED8", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 500 }}>{repo.language || "TypeScript"}</span>
                        <span style={{ background: "#10B981", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 500 }}>Good for Contribution</span>
                        {repo.open_issues_count > 0 && <span style={{ background: "#10B981", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 500 }}>{repo.open_issues_count} Issues</span>}
                      </div>

                      <div style={{ display: "flex", gap: "16px", alignItems: "center", fontSize: "1rem", color: "#4B5563" }}>
                        <span><strong style={{ color: "#111827", fontWeight: 700 }}>{repo.stargazers_count >= 1000 ? (repo.stargazers_count / 1000).toFixed(1) + 'k' : repo.stargazers_count}</strong> Stars</span>
                        <span><strong style={{ color: "#111827", fontWeight: 700 }}>{repo.forks_count >= 1000 ? (repo.forks_count / 1000).toFixed(1) + 'k' : repo.forks_count}</strong> Forks</span>
                      </div>
                    </div>

                    {/* Right Side: Suggested Issue Box */}
                    <div style={{ flex: "1 1 300px", background: "#F0FDF4", border: "1px solid #10B981", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.75rem", color: "#111827", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "12px" }}>Suggested Issue</span>
                      
                      <p style={{ fontSize: "0.95rem", color: "#111827", margin: "0 0 16px 0", lineHeight: 1.5, flex: 1 }}>
                        <strong style={{ fontWeight: 700 }}>{suggestedIssue}:</strong> {suggestedDesc}
                      </p>
                      
                      <div style={{ borderTop: "1px solid rgba(16,185,129,0.2)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <a href={repo.html_url + "/issues"} target="_blank" rel="noopener noreferrer" style={{ color: "#111827", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
                          View Issue on GitHub
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                        </a>
                      </div>
                      <div style={{ marginTop: "12px", textAlign: "right" }}>
                        {savedRepos.find(r => r.id === repo.id) ? (
                          <button onClick={() => setSavedRepos(prev => prev.filter(r => r.id !== repo.id))} style={{ background: "#F3F4F6", color: "#4B5563", border: "1px solid #E5E7EB", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            ✓ Saved
                          </button>
                        ) : (
                          <button onClick={() => setSavedRepos(prev => [...prev, repo])} style={{ background: "#111827", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>
                            Save Repo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: 48, textAlign: "center", color: "#6B7280" }}>No trending projects found for this timeframe.</div>
            )}
            
            <button className="btn-secondary" style={{ marginTop: 24, alignSelf: "flex-start", padding: "8px 24px" }} onClick={() => setView("skills")}>
              ← Back to Skills
            </button>
          </div>
        </div>
      )}
          </div>
        </main>
      </div>

      {/* ═══ LOGIN MODAL (Brilliant Style) ═══ */}
      {isLoginModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }} onClick={() => setIsLoginModalOpen(false)}>
          <div style={{ background: "#fff", width: "90%", maxWidth: "440px", borderRadius: "16px", padding: "72px 40px 64px 40px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            
            <BrilliantLogo />

            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#111", marginBottom: "32px" }}>Log in</h2>

            <button 
              onClick={() => signIn("github")}
              style={{ width: "100%", padding: "16px", background: "#111", color: "#fff", border: "none", borderRadius: "12px", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}
              onMouseOver={e => e.currentTarget.style.transform="translateY(-2px)"}
              onMouseOut={e => e.currentTarget.style.transform="translateY(0)"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
              Log in with GitHub
            </button>



            <p style={{ marginTop: "40px", fontSize: "0.7rem", color: "#9CA3AF", textAlign: "center", lineHeight: 1.5 }}>
              This site is protected by reCAPTCHA and the Google Privacy<br/>Policy and Terms of Service apply
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

function BrilliantLogo() {
  const dotRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dotRef.current) return;
      // Calculate cursor position relative to screen center, max travel ~8px
      const x = ((e.clientX / window.innerWidth) - 0.5) * 16;
      const y = ((e.clientY / window.innerHeight) - 0.5) * 16;
      dotRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div style={{ width: "96px", height: "96px", position: "relative", marginBottom: "32px" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#10B981", borderRadius: "32px", transform: "rotate(-15deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "40px", height: "40px", background: "#fff", borderRadius: "12px", transform: "rotate(15deg)", position: "relative" }}>
           <div ref={dotRef} style={{ position: "absolute", top: 12, left: 12, width: 16, height: 16, background: "#111", borderRadius: 4, transition: "transform 0.1s ease-out" }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: "10px", left: "-20px", width: "120%", height: "120%", background: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(255,255,255,0) 70%)", zIndex: -1 }} />
    </div>
  );
}

function ScoreRing({ score, size = 104, strokeWidth = 8, darkText = false }: { score: number, size?: number, strokeWidth?: number, darkText?: boolean }) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#10B981" : score >= 50 ? "#3B82F6" : score >= 30 ? "#F59E0B" : "#EF4444";

  return (
    <div className="score-ring-wrapper" style={{ width: size, height: size, position: "relative" }}>
      <svg className="score-ring" width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease-out" }} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: `${size / 4}px`, fontWeight: 800, color: darkText ? "#111827" : "#fff", letterSpacing: "-1px" }}>{score}%</div>
      </div>
    </div>
  );
}

function HalfScoreRing({ score, size = 200, strokeWidth = 20 }: { score: number, size?: number, strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = Math.PI * radius;
  const startX = strokeWidth / 2;
  const startY = size / 2;
  const endX = size - strokeWidth / 2;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div style={{ width: size, height: size / 2 + 10, position: "relative", display: "flex", justifyContent: "center" }}>
      <svg width={size} height={size / 2 + strokeWidth / 2}>
        <path d={`M ${startX},${startY} A ${radius},${radius} 0 0,1 ${endX},${startY}`} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={`M ${startX},${startY} A ${radius},${radius} 0 0,1 ${endX},${startY}`} fill="none" stroke="#2563EB" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease-out" }} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", bottom: strokeWidth / 2 - 10, left: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: "2.8rem", fontWeight: 800, color: "#111827", letterSpacing: "-1px", lineHeight: 1 }}>{score}<span style={{ fontSize: "1.2rem", color: "#6B7280", fontWeight: 600 }}>/100</span></div>
        <div style={{ fontSize: "1rem", fontWeight: 600, color: score >= 75 ? "#10B981" : score >= 50 ? "#3B82F6" : "#F59E0B", marginTop: "8px" }}>
           {score >= 75 ? "High" : score >= 50 ? "Medium" : "Low"}
        </div>
      </div>
    </div>
  );
}

