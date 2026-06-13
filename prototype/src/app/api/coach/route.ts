// ============================================================
// API Route: /api/coach — Runs Step 5 (Contrib Coach)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runCoachAgent } from "@/lib/agents";
import type { GlobalState } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { state, issueIndex } = body as {
      state: GlobalState;
      issueIndex: number;
    };

    if (!state || issueIndex === undefined) {
      return NextResponse.json(
        { error: "State and issue index are required" },
        { status: 400 }
      );
    }

    const updatedState = await runCoachAgent(state, issueIndex);

    return NextResponse.json({
      state: updatedState,
      step: "coaching_complete",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Coach error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
