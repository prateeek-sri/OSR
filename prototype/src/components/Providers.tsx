"use client";

import { SessionProvider } from "next-auth/react";
import React, { createContext, useContext, useState, useEffect } from "react";
import type { GlobalState, PipelineStep } from "@/lib/types";

interface AppStateContextType {
  state: GlobalState | null;
  setState: React.Dispatch<React.SetStateAction<GlobalState | null>>;
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  targetRole: string;
  setTargetRole: React.Dispatch<React.SetStateAction<string>>;
  step: PipelineStep;
  setStep: React.Dispatch<React.SetStateAction<PipelineStep>>;
  completedSteps: PipelineStep[];
  setCompletedSteps: React.Dispatch<React.SetStateAction<PipelineStep[]>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  view: "landing" | "skills" | "overview" | "gaps" | "opensource" | "roadmap";
  setView: React.Dispatch<React.SetStateAction<"landing" | "skills" | "overview" | "gaps" | "opensource" | "roadmap">>;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within Providers");
  return ctx;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // Try to load state from localStorage if it exists so refreshes don't break the app completely
  const [state, setState] = useState<GlobalState | null>(null);
  const [username, setUsername] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [step, setStep] = useState<PipelineStep>("idle");
  const [completedSteps, setCompletedSteps] = useState<PipelineStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"landing" | "skills" | "overview" | "gaps" | "opensource" | "roadmap">("landing");

  // Load from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("osr_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(parsed.state);
        setUsername(parsed.username || "");
        setTargetRole(parsed.targetRole || "");
        setView(parsed.view || "landing");
      }
    } catch(e) {}
  }, []);

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem("osr_state", JSON.stringify({ state, username, targetRole, view }));
    } catch(e) {}
  }, [state, username, targetRole, view]);

  return (
    <SessionProvider>
      <AppStateContext.Provider value={{ state, setState, username, setUsername, targetRole, setTargetRole, step, setStep, completedSteps, setCompletedSteps, error, setError, view, setView }}>
        {children}
      </AppStateContext.Provider>
    </SessionProvider>
  );
}
