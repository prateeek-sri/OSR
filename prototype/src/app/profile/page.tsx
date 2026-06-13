"use client";

import Dashboard from "@/components/Dashboard";
import { useAppState } from "@/components/Providers";
import { useEffect } from "react";

export default function ProfilePage() {
  const { setView } = useAppState();

  useEffect(() => {
    // Force the view to skills (Profile) when entering the /profile route
    setView("skills");
  }, [setView]);

  return <Dashboard />;
}
