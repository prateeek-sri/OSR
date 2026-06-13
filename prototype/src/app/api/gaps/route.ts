// ============================================================
// API Route: /api/gaps — Step 3 (Gap Finder)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runGapFinderAgent } from "@/lib/agents";
import type { GlobalState } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { state, targetRole } = body as { state: GlobalState; targetRole: string };

    if (!state || !targetRole) {
      return NextResponse.json({ error: "State and target role are required" }, { status: 400 });
    }

    const stateWithRole: GlobalState = {
      ...state,
      user_context: { ...state.user_context, target_role: targetRole },
    };

    const updatedState = await runGapFinderAgent(stateWithRole);
    return NextResponse.json({ state: updatedState, step: "gap_finding_complete" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Gap finder error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
