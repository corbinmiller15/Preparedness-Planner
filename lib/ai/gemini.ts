export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const REWORD_INSTRUCTION = [
  "Reword the user's text so it is clearer.",
  "Do not add facts, quantities, medical advice, locations, or warnings that are not already in the text.",
  "Do not change numbers.",
  "Return only the reworded text.",
].join(" ");

export type RewordResult =
  | { ok: true; text: string; model: string }
  | { ok: false; skipped: true; reason: "missing_api_key" }
  | { ok: false; skipped: false; reason: "request_failed" };

function configured(
  explicit: string | null | undefined,
  envValue: string | undefined,
): string | undefined {
  if (explicit === null) return undefined;
  const value = explicit ?? envValue;
  return value && value.length > 0 ? value : undefined;
}

/**
 * Rewords text with Gemini Flash. This is not used by the calculation engine.
 * If GEMINI_API_KEY is missing, it returns skipped and does not call the network.
 */
export async function rewordText(
  text: string,
  deps?: {
    fetchImpl?: typeof fetch;
    apiKey?: string | null;
    model?: string | null;
  },
): Promise<RewordResult> {
  const apiKey = configured(deps?.apiKey, process.env.GEMINI_API_KEY);
  if (!apiKey) return { ok: false, skipped: true, reason: "missing_api_key" };
  const model = configured(deps?.model, process.env.GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL;
  const fetchImpl = deps?.fetchImpl ?? fetch;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: REWORD_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text }] }],
    }),
  });
  if (!response.ok) return { ok: false, skipped: false, reason: "request_failed" };
  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rewritten = body.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!rewritten) return { ok: false, skipped: false, reason: "request_failed" };
  return { ok: true, text: rewritten, model };
}
