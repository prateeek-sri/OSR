// ============================================================
// API Route: /api/match — Step 4 (OS Matchmaker)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { setGitHubToken } from "@/lib/github";
import { runMatchmakerAgent } from "@/lib/agents";
import type { GlobalState } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const token = (session as unknown as Record<string, unknown>)?.accessToken as string | undefined;
    if (token) setGitHubToken(token);

    const body = await req.json();
    const { state } = body as { state: GlobalState };

    if (!state) {
      return NextResponse.json({ error: "State is required" }, { status: 400 });
    }

    const updatedState = await runMatchmakerAgent(state);
    return NextResponse.json({ state: updatedState, step: "matching_complete" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Matchmaker error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
