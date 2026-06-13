// ============================================================
// Gemini AI Client — Wrapper for all agent LLM calls
// With automatic retry + exponential backoff for rate limits
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment variables");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean = true
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: jsonMode
      ? {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 8192,
        }
      : {
          temperature: 0.4,
          maxOutputTokens: 8192,
        },
  });

  const maxRetries = 4;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add a small delay between consecutive calls to avoid burst rate limits
      if (attempt > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 40000);
        console.log(`[Gemini] Rate limited, retrying in ${backoffMs / 1000}s (attempt ${attempt + 1}/${maxRetries + 1})...`);
        await sleep(backoffMs);
      }

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
          },
        ],
      });

      const response = result.response;
      return response.text();
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes("429") ||
          error.message.includes("quota") ||
          error.message.includes("rate"));

      if (isRateLimit && attempt < maxRetries) {
        // Extract retry delay from error if available, otherwise use exponential backoff
        const retryMatch = error instanceof Error && error.message.match(/retry in ([\d.]+)s/i);
        const waitTime = retryMatch
          ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000
          : Math.min(2000 * Math.pow(2, attempt), 45000);
        
        console.log(`[Gemini] Rate limit hit. Waiting ${waitTime / 1000}s...`);
        await sleep(waitTime);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Gemini: Max retries exceeded");
}
