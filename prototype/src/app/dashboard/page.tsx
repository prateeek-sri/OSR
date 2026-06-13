"use client";

import Dashboard from "@/components/Dashboard";
import { useAppState } from "@/components/Providers";
import { useEffect } from "react";

export default function DashboardPage() {
  const { setView } = useAppState();

  useEffect(() => {
    // Force the view to roadmap when entering the /dashboard route
    setView("roadmap");
  }, [setView]);

  return <Dashboard />;
}
