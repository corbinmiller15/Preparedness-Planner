import { describe, expect, it, vi } from "vitest";
import { DEFAULT_GEMINI_MODEL, rewordText } from "@/lib/ai/gemini";

describe("rewordText", () => {
  it("does not call Gemini without an API key", async () => {
    const fetchImpl = vi.fn();
    const result = await rewordText("Store water.", { fetchImpl, apiKey: null });
    expect(result).toEqual({ ok: false, skipped: true, reason: "missing_api_key" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends a reword-only request to Gemini Flash when a key is present", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      void url;
      void init;
      return Response.json({
        candidates: [{ content: { parts: [{ text: "Keep water stored." }] } }],
      });
    });
    const result = await rewordText("Store water.", { fetchImpl, apiKey: "test-key", model: null });
    expect(result).toEqual({ ok: true, text: "Keep water stored.", model: DEFAULT_GEMINI_MODEL });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toContain(`/models/${DEFAULT_GEMINI_MODEL}:generateContent`);
    expect(String(url)).not.toContain("test-key");
    const body = JSON.parse(String(init?.body));
    expect(body.systemInstruction.parts[0].text).toContain("Do not add facts");
    expect(body.contents[0].parts[0].text).toBe("Store water.");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "test-key" });
  });
});
