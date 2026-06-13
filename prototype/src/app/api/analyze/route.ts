// ============================================================
// API Route: /api/analyze — Steps 1-2 (Ingestion + Analysis)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { setGitHubToken } from "@/lib/github";
import { runIngestionAgent, runProfileAnalysisAgent } from "@/lib/agents";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const token = (session as unknown as Record<string, unknown>)?.accessToken as string | undefined;
    if (token) setGitHubToken(token);

    const body = await req.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
    }

    let state = await runIngestionAgent(username, "");
    state = await runProfileAnalysisAgent(state);

    return NextResponse.json({ state, step: "analysis_complete" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Pipeline error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
