"use client";

import React, { useState, useCallback, useEffect } from "react";
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
} from "lucide-react";
import type { GlobalState, PipelineStep } from "@/lib/types";

const NAV_STEPS = [
  { id: "skills", label: "Profile" },
  { id: "gaps", label: "Skill Gaps" },
  { id: "opensource", label: "Open Source" },
  { id: "roadmap", label: "Roadmap" },
];

function SidebarLink({ active, text, onClick, disabled, icon }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px 20px", 
        border: "none", background: active ? "rgba(255,255,255,0.1)" : "transparent",
        color: active ? "#fff" : disabled ? "#4B5563" : "#D1D5DB",
        cursor: disabled ? "not-allowed" : "pointer", textAlign: "left", fontSize: "0.95rem", fontWeight: 500,
        borderRadius: "8px", transition: "all 0.2s"
      }}
      onMouseOver={(e) => !disabled && !active && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
      onMouseOut={(e) => !disabled && !active && (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ color: active ? "#3B82F6" : "inherit" }}>{icon}</span>
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
  const { data: session, status } = useSession();
  const [username, setUsername] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [state, setState] = useState<GlobalState | null>(null);
  const [step, setStep] = useState<PipelineStep>("idle");
  const [completedSteps, setCompletedSteps] = useState<PipelineStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("landing");
  const [activeMilestones, setActiveMilestones] = useState<Record<string, boolean | undefined>>({});
  const [isSaved, setIsSaved] = useState(false);
  
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
          <div style={{ fontWeight: 800, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "6px", letterSpacing: "-0.5px" }}>
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
      <aside style={{ width: "260px", background: "#111827", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid #1F2937" }}>
        {/* Logo Area */}
        <div style={{ height: "80px", display: "flex", alignItems: "center", padding: "0 24px", color: "#fff", borderBottom: "1px solid #1F2937" }}>
          <div style={{ fontWeight: 800, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "6px", letterSpacing: "-0.5px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
            IDR
          </div>
        </div>

        {/* Setup Progress Widget */}
        <div style={{ padding: "24px", borderBottom: "1px solid #1F2937", marginBottom: "16px" }}>
          <div style={{ fontSize: "0.85rem", color: "#9CA3AF", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Setup Progress</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "12px" }}>
             <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
               {state?.dynamic_roadmap ? "4" : state?.remediation_strategy ? "3" : state ? "2" : "1"}
             </div>
             <div>
               <span style={{ fontSize: "1rem" }}>/ 4 Steps</span>
               <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 500, marginTop: "2px" }}>{state?.dynamic_roadmap ? "Roadmap ready!" : "Let's build your profile"}</div>
             </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
           <SidebarLink active={view==="skills"} text="Profile Setup" onClick={() => setView("skills")} icon={<User size={18}/>} />
           <SidebarLink active={view==="overview" || view==="gaps"} text="Gap Analysis" onClick={() => state?.remediation_strategy && setView("overview")} disabled={!state?.remediation_strategy} icon={<Target size={18}/>} />
           <SidebarLink active={view==="opensource"} text="Open Source" onClick={() => state && setView("opensource")} disabled={!state} icon={<Search size={18}/>} />
           <SidebarLink active={view==="roadmap"} text="Career Roadmap" onClick={() => state?.dynamic_roadmap && setView("roadmap")} disabled={!state?.dynamic_roadmap} icon={<Map size={18}/>} />
           
           <div style={{ marginTop: "32px", marginBottom: "8px", paddingLeft: "20px", fontSize: "0.75rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Preferences</div>
           <SidebarLink active={false} text="Settings" disabled={true} icon={<Settings size={18}/>} />
        </nav>
      </aside>

      {/* Main Column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Top Header */}
        <header style={{ height: "80px", display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "0 40px", background: "#fff", borderBottom: "1px solid var(--border)", zIndex: 10, gap: "32px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "48px", fontWeight: 600, fontSize: "0.95rem", color: "#4B5563" }}>
            <span style={{ cursor: "pointer" }}>Explore</span>
            <span style={{ cursor: "pointer" }}>Help</span>
            <span style={{ cursor: "pointer" }}>Pricing</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button onClick={resetAll} style={{ background: "transparent", color: "#111827", border: "1px solid #D1D5DB", padding: "10px 24px", borderRadius: "30px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background="#F3F4F6"} onMouseOut={e => e.currentTarget.style.background="transparent"}>
              New Analysis
            </button>
            {session ? (
              <button onClick={() => signOut()} style={{ background: "#F3F4F6", color: "#111827", border: "none", padding: "10px 24px", borderRadius: "30px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>Sign out</button>
            ) : (
              <button onClick={() => signIn("github")} style={{ background: "#2563EB", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "30px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>Sign in</button>
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
      {view !== "landing" && isRunning && (
        <div className="fade-in" style={{ padding: "24px 0", width: "100%", display: "flex", flexDirection: "column", gap: "24px", opacity: 0.7 }}>
          <div className="skeleton-pulse" style={{ height: "140px", borderRadius: "16px", background: "var(--bg-elevated)" }} />
          <div style={{ display: "flex", gap: "24px", flexDirection: "row", flexWrap: "wrap" }}>
            <div className="skeleton-pulse" style={{ flex: 1, minWidth: "300px", height: "240px", borderRadius: "16px", background: "var(--bg-elevated)" }} />
            <div className="skeleton-pulse" style={{ flex: 2, minWidth: "300px", height: "240px", borderRadius: "16px", background: "var(--bg-elevated)" }} />
          </div>
          <div className="skeleton-pulse" style={{ height: "300px", borderRadius: "16px", background: "var(--bg-elevated)" }} />
        </div>
      )}



      {/* ═══ SKILLS VIEW ═══ */}
      {view === "skills" && state && !isRunning && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1000px" }}>
          
          {/* Top Card: Profile & Languages */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--border)", padding: "32px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
              {state.raw_github_metadata.profile?.avatar_url ? (
                <img src={state.raw_github_metadata.profile.avatar_url} style={{ width: 80, height: 80, borderRadius: "20px" }} alt="Avatar" />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: "20px", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <User size={32} color="var(--text-muted)" />
                </div>
              )}
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "12px", color: "var(--text-primary)", margin: "0 0 8px 0" }}>
                  {state.raw_github_metadata.profile?.name || username || githubUsername} 
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-primary)", padding: "4px 12px", borderRadius: "20px" }}>
                    &lt;/&gt; {username || githubUsername}
                  </span>
                </h2>
                <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                  {state.raw_github_metadata.profile?.bio || "Software Engineer focused on building great products."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "24px", marginBottom: "32px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "150px", padding: "20px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg-primary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", marginBottom: "8px" }}><User size={16}/></div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{state.raw_github_metadata.profile?.followers || 0}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Followers</div>
              </div>
              <div style={{ flex: 1, minWidth: "150px", padding: "20px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg-primary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", marginBottom: "8px" }}><BookOpen size={16}/></div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{state.raw_github_metadata.profile?.public_repos || state.raw_github_metadata.repositories.length}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Repos</div>
              </div>
              <div style={{ flex: 1, minWidth: "150px", padding: "20px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg-primary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", marginBottom: "8px" }}><GitBranch size={16}/></div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {state.raw_github_metadata.commit_history_insights.reduce((acc, curr) => acc + curr.total_commits, 0) || 1832}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Contributions</div>
              </div>
            </div>

            {/* Language Breakdown */}
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "16px" }}>Language Breakdown</div>
              <div style={{ display: "flex", width: "100%", height: "12px", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" }}>
                {Object.entries(state.raw_github_metadata.languages).length > 0 ? (
                  Object.entries(state.raw_github_metadata.languages)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([name, bytes], i) => {
                      const totalBytes = Object.values(state.raw_github_metadata.languages).reduce((a, b) => a + b, 0);
                      const percent = (bytes / totalBytes) * 100;
                      const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];
                      return <div key={name} style={{ width: `${percent}%`, height: "100%", background: colors[i % colors.length] }} />;
                    })
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "var(--border)" }} />
                )}
              </div>
              <div style={{ display: "flex", gap: "24px", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {Object.entries(state.raw_github_metadata.languages)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([name, bytes], i) => {
                    const totalBytes = Object.values(state.raw_github_metadata.languages).reduce((a, b) => a + b, 0);
                    const percent = Math.round((bytes / totalBytes) * 100);
                    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];
                    return (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i % colors.length] }} />
                        {name} {percent}%
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Bottom Card: Recruitability Score */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--border)", padding: "32px", boxShadow: "var(--shadow-sm)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
               <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Recruitability Score</h3>
               <span style={{ padding: "6px 16px", background: "var(--bg-primary)", color: "var(--text-secondary)", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600 }}>
                 ↗ +6 this month
               </span>
             </div>

             <div style={{ display: "flex", gap: "48px", alignItems: "center", flexWrap: "wrap" }}>
               {/* Left: Score Ring */}
               <div style={{ flexShrink: 0 }}>
                 <ScoreRing score={state.analysis_results?.employability_index || 0} size={180} strokeWidth={16} darkText />
               </div>
               
               {/* Right: Breakdown */}
               <div style={{ flex: 1, minWidth: "300px" }}>
                 <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                   {(state.analysis_results?.employability_index || 0) >= 75 ? "Highly Recruitable" : (state.analysis_results?.employability_index || 0) >= 50 ? "Solid Candidate" : "Needs Improvement"}
                 </h4>
                 <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "0 0 24px 0" }}>
                   You rank in the top {100 - (state.analysis_results?.employability_index || 0)}% of {state.user_context.target_role || "developers"} in your region.
                 </p>

                 <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {[
                      { label: "Code Quality", score: Math.min((state.analysis_results?.employability_index || 0) + 6, 100) },
                      { label: "Activity", score: Math.min((state.analysis_results?.employability_index || 0) - 3, 100) },
                      { label: "Collaboration", score: Math.min((state.analysis_results?.employability_index || 0) - 8, 100) },
                      { label: "Project Depth", score: Math.min((state.analysis_results?.employability_index || 0) + 3, 100) }
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 500 }}>
                          <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{item.score}</span>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "var(--bg-primary)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${item.score}%`, height: "100%", background: "#111827", borderRadius: "3px" }} />
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
             </div>
          </div>

          {/* Gap Finder Form */}
          <div className="card fade-in fade-in-delay-3" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.05), rgba(59,130,246,0.02))", border: "1px solid rgba(37,99,235,0.1)" }}>
             <div className="section-header">
               <h3 className="section-title"><Briefcase size={18} /> Ready to find your gaps?</h3>
             </div>
             <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 16 }}>
               Enter your target role — our AI Recruiter will identify what&apos;s missing and match you
               with open-source issues.
             </p>
             <form style={{ display: "flex", gap: 12, flexWrap: "wrap" }} onSubmit={(e) => { e.preventDefault(); if (targetRole) runGapAnalysis(); }}>
               <div className="input-group" style={{ flex: 1, minWidth: 250, background: "#fff" }}>
                 <Briefcase />
                 <input id="target-role" className="input-field" type="text"
                   placeholder="e.g. Full-Stack Developer, Backend Engineer..."
                   value={targetRole} onChange={(e) => setTargetRole(e.target.value)} style={{ color: "#111" }} />
               </div>
               <div style={{ display: "flex", gap: "12px", width: "100%", flexWrap: "wrap" }}>
                 <button className="btn-primary" onClick={runGapAnalysis} disabled={isRunning} style={{ flex: 1, justifyContent: "center" }}>
                   <Target size={18} /> Find My Gaps
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}



      {/* ═══ GAP ANALYSIS VIEW ═══ */}
      {(view === "overview" || view === "gaps") && state && !isRunning && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1000px" }}>
          
          {/* Header Action Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "20px 24px", borderRadius: "12px", border: "1px solid var(--border)", color: "var(--text-primary)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Live Analysis Ready for {state.user_context.target_role || "your target role"}</span>
              </div>
              <div style={{ borderLeft: "1px solid var(--border)", height: "24px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Recruitability:</span>
                <span style={{ fontWeight: 800, fontSize: "1.05rem", color: state.analysis_results.employability_index >= 75 ? "var(--success)" : state.analysis_results.employability_index >= 50 ? "#3B82F6" : "#F59E0B" }}>
                  {state.analysis_results.employability_index}%
                </span>
              </div>
            </div>
            
            {/* Direct Roadmap Generator Button */}
            <button className="btn-primary" onClick={runRoadmap} disabled={isRunning || (state.dynamic_roadmap?.milestones?.length || 0) > 0} style={{ padding: "8px 16px", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
              <Map size={14} /> {(state.dynamic_roadmap?.milestones?.length || 0) > 0 ? "Roadmap Generated" : "Generate Career Roadmap"}
            </button>
          </div>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Strengths Column */}
            <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0" }}>Core Strengths</h3>
              {Object.entries(state.analysis_results.technical_proficiency)
                .sort((a, b) => b[1].score - a[1].score)
                .slice(0, 4)
                .map(([name, data], idx) => (
                   <div key={`str-${idx}`} style={{ background: "#fff", borderRadius: "12px", border: "1px solid var(--border)", padding: "24px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--shadow-sm)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                         <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Mastered: {name}</h4>
                         <span style={{ padding: "4px 12px", background: "rgba(16, 185, 129, 0.1)", color: "#059669", fontSize: "0.75rem", borderRadius: "6px", fontWeight: 600 }}>Strength</span>
                      </div>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>You have strong experience utilizing {name} across your open-source contributions. Recruiter signal is high.</p>
                   </div>
                ))}
            </div>

            {/* Gaps Column */}
            <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0" }}>Identified Gaps</h3>
              {state.analysis_results.structural_gaps.map((gap, idx) => (
                   <div key={`gap-${idx}`} style={{ background: "#fff", borderRadius: "12px", border: "1px solid var(--border)", padding: "24px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--shadow-sm)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                         <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{gap.title}</h4>
                         <span style={{ padding: "4px 12px", background: gap.severity === "critical" ? "rgba(220, 38, 38, 0.1)" : "rgba(217, 119, 6, 0.1)", color: gap.severity === "critical" ? "#DC2626" : "#D97706", fontSize: "0.75rem", borderRadius: "6px", fontWeight: 600 }}>{gap.severity === "critical" ? "Critical Gap" : "High Priority"}</span>
                      </div>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{gap.description}</p>
                   </div>
              ))}
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
                  className={`btn-${isSaved ? 'secondary' : 'primary'}`} 
                  onClick={() => setIsSaved(!isSaved)}
                >
                  {isSaved ? "✓ Saved to Profile" : "Save Pipeline"}
                </button>
              </div>
              
              {state.dynamic_roadmap.overall_learning_summary && (
                <div style={{ marginBottom: 32, padding: "20px", background: "#fff", borderRadius: "12px", borderLeft: "4px solid #3B82F6", borderTop: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                    {state.dynamic_roadmap.overall_learning_summary}
                  </p>
                </div>
              )}
              
              <div style={{ display: "flex", overflowX: "auto", padding: "16px 8px 32px 8px", gap: "48px", minHeight: "380px", alignItems: "stretch" }}>
                {state.dynamic_roadmap.milestones.map((m, idx) => {
                  const isActive = activeMilestones[m.id] !== undefined ? activeMilestones[m.id] : m.status === "active";
                  const color = isActive ? "#10B981" : "var(--border)";
                  
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", position: "relative" }}>
                      {/* The Node Card */}
                      <div style={{ width: "320px", height: "100%", flexShrink: 0, background: "#fff", border: `2px solid ${color}`, borderRadius: "12px", boxShadow: isActive ? "0 8px 30px rgba(16, 185, 129, 0.15)" : "var(--shadow-sm)", padding: "24px", display: "flex", flexDirection: "column", position: "relative", zIndex: 2 }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px" }}>Stage {idx + 1}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: isActive ? "rgba(16, 185, 129, 0.1)" : "var(--bg-primary)", color: isActive ? "#10B981" : "var(--text-muted)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 }}>
                            {isActive ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} /> : null}
                            {isActive ? "Active" : "Pending"}
                          </div>
                        </div>
                        
                        <h4 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px", lineHeight: 1.3 }}>{m.title}</h4>
                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "24px", flex: 1 }}>{m.description}</p>
                        
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
                          {m.skills_involved.slice(0, 3).map(skill => (
                            <span key={skill} style={{ fontSize: "0.75rem", background: "var(--bg-primary)", color: "var(--text-secondary)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border-light)", fontWeight: 500 }}>{skill}</span>
                          ))}
                        </div>

                        {m.resources && m.resources.length > 0 && (
                          <div style={{ marginBottom: "24px" }}>
                             <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Resources</div>
                             <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                               {m.resources.slice(0, 2).map((res, i) => (
                                 <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "#3B82F6", textDecoration: "none", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    • {res.title}
                                 </a>
                               ))}
                             </div>
                          </div>
                        )}

                        <button className={isActive ? "btn-primary" : "btn-secondary"} style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "0.9rem", marginTop: "auto" }}>
                          {isActive ? "Complete Stage" : "View Details"}
                        </button>
                      </div>

                      {/* Connecting Line */}
                      {idx < state.dynamic_roadmap.milestones.length - 1 && (
                         <div style={{ position: "absolute", right: "-48px", top: "50%", transform: "translateY(-50%)", width: "48px", height: "3px", background: color, zIndex: 1 }} />
                      )}
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
        <div className="os-finder-layout fade-in" style={{ marginBottom: 48 }}>
          
          {/* Sidebar Filters */}
          <aside className="os-sidebar">
            <div className="os-sidebar-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.1rem" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                Filters
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>Configure your search filters</p>
            </div>
            
            <div className="os-filter-group">
              <label>Language</label>
              <select className="os-select" value={osLanguage} onChange={(e) => {
                setOsLanguage(e.target.value);
                fetchTrendingOS(osTimeframe, e.target.value);
              }}>
                <option value="Any">Any</option>
                {Object.keys(state.raw_github_metadata.languages).map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            
            <div className="os-filter-group">
              <label>Minimum Stars</label>
              <select className="os-select"><option>Any</option><option>100+</option><option>1000+</option></select>
            </div>
            
            <div className="os-filter-group">
              <label>Last Updated</label>
              <select className="os-select"><option>Any time</option><option>Past week</option></select>
            </div>
            
            <div className="os-filter-group">
              <label>Minimum Open Issues</label>
              <select className="os-select"><option>Any</option><option>10+</option></select>
            </div>
          </aside>

          {/* Main Content */}
          <div className="os-main">
            <div className="os-search-bar">
              <h4 style={{ marginBottom: 8, fontSize: "0.9rem", color: "var(--text-primary)" }}>Search Projects</h4>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <input className="input-field" style={{ background: "#fff", borderColor: "var(--border)" }} placeholder={`Search for ${Object.keys(state.raw_github_metadata.languages)[0] || 'projects'}...`} />
                </div>
                <button className="btn-secondary"><Search size={16} /> Search</button>
              </div>
            </div>

            <div className="os-trending-header">
              <h3>Trending Projects <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "normal" }}>({osProjects.length})</span></h3>
              <div className="os-tabs">
                <button className={`os-tab ${osTimeframe === 'daily' ? 'active' : ''}`} onClick={() => fetchTrendingOS('daily')}>Daily</button>
                <button className={`os-tab ${osTimeframe === 'weekly' ? 'active' : ''}`} onClick={() => fetchTrendingOS('weekly')}>Weekly</button>
                <button className={`os-tab ${osTimeframe === 'monthly' ? 'active' : ''}`} onClick={() => fetchTrendingOS('monthly')}>Monthly</button>
              </div>
            </div>

            <div className="os-project-list">
              {osLoading ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading latest GitHub projects...</div>
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
                  <div key={repo.id} className="os-project-card" style={{ display: "flex", gap: "24px", alignItems: "stretch" }}>
                    
                    {/* Left Side: Repo Info & Stats */}
                    <div className="os-project-info" style={{ flex: 1.5, display: "flex", flexDirection: "column", paddingRight: 0 }}>
                      <h4 className="os-project-title"><a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-primary)", textDecoration: "none" }}>{repo.full_name}</a></h4>
                      <p className="os-project-desc">{repo.description || "No description provided."}</p>
                      
                      <div className="os-project-tags" style={{ marginBottom: "auto", paddingBottom: "24px" }}>
                        <span className="os-tag lang">{repo.language || "Unknown"}</span>
                        <span className="os-tag outline">Good for Contribution</span>
                        {repo.open_issues_count > 0 && <span className="os-tag status"><span className="dot"></span> {repo.open_issues_count} Issues</span>}
                      </div>

                      <div className="os-project-stats" style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "flex-start", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                        <button className="roadmap-btn ghost" onClick={() => window.open(repo.html_url, '_blank')} style={{ padding: "6px 12px", background: "var(--bg-elevated)", color: "var(--text-primary)" }}>
                          View Repository ↗
                        </button>
                        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> {repo.stargazers_count >= 1000 ? (repo.stargazers_count / 1000).toFixed(1) + 'k' : repo.stargazers_count}</span>
                        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><circle cx="18" cy="6" r="3"></circle><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path><path d="M12 12v3"></path></svg> {repo.forks_count >= 1000 ? (repo.forks_count / 1000).toFixed(1) + 'k' : repo.forks_count}</span>
                      </div>
                    </div>

                    {/* Right Side: Suggested Issue Box */}
                    <div style={{ flex: 1, background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Suggested Issue</span>
                        <span style={{ fontSize: "0.7rem", background: "rgba(16,185,129,0.1)", color: "var(--success)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(16,185,129,0.2)" }}>Open</span>
                      </div>
                      
                      <h5 style={{ fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "8px", lineHeight: 1.4 }}>{suggestedIssue}</h5>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "auto", lineHeight: 1.5 }}>
                        {suggestedDesc}
                      </p>
                      
                      <button className="btn-secondary" style={{ width: "100%", marginTop: "16px", padding: "8px", fontSize: "0.8rem", justifyContent: "center" }} onClick={() => window.open(`${repo.html_url}/issues?q=is%3Aissue+is%3Aopen`, '_blank')}>
                        View Issue on GitHub ↗
                      </button>
                    </div>

                  </div>
                )})
              ) : (
                <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>No trending projects found for this timeframe.</div>
              )}
            </div>

            {/* Removed standalone Blueprint, as we replaced the Matchmaker specific logic with real GitHub Repo links */}
            
            <button className="btn-secondary" style={{ marginTop: 24 }} onClick={() => setView("skills")}>
              ← Back
            </button>
          </div>
        </div>
      )}
          </div>
        </main>
      </div>
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
