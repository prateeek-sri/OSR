// ============================================================
// API Route: /api/roadmap — Runs Step 6 (Career Roadmap)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runRoadmapAgent } from "@/lib/agents";
import type { GlobalState } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { state } = body as { state: GlobalState };

    if (!state) {
      return NextResponse.json(
        { error: "State is required" },
        { status: 400 }
      );
    }

    const updatedState = await runRoadmapAgent(state);

    return NextResponse.json({
      state: updatedState,
      step: "roadmap_complete",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Roadmap error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
