
export const MODELS = {
  PROFILE_ANALYSIS: "meta/llama-3.1-8b-instruct",
  GAP_ANALYSIS: "meta/llama-3.1-8b-instruct",
  COACHING: "meta/llama-3.1-8b-instruct",
  ROADMAP: "meta/llama-3.2-11b-vision-instruct",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callNvidia(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean = true,
  maxTokens: number = 4000
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not set in environment variables");
  }

  const url = "https://integrate.api.nvidia.com/v1/chat/completions";
  const maxRetries = 4;

  const payload = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: jsonMode ? 0.3 : 0.7,
    max_tokens: maxTokens,
    stream: false,
    response_format: jsonMode ? { type: "json_object" } : undefined
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 40000);
        console.log(`[NVIDIA API] Rate limited or error, retrying in ${backoffMs / 1000}s (attempt ${attempt + 1}/${maxRetries + 1})...`);
        await sleep(backoffMs);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isRateLimit = response.status === 429;
        
        if (isRateLimit && attempt < maxRetries) {
          continue; // Will trigger backoff in next iteration
        }
        
        throw new Error(`NVIDIA API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
      
    } catch (error: unknown) {
      if (attempt < maxRetries && error instanceof Error && error.message.includes("429")) {
        continue; // Handle fetch failure that might have '429' in error string
      }
      if (attempt >= maxRetries) {
        throw error;
      }
    }
  }

  throw new Error("NVIDIA API: Max retries exceeded");
}
