import { describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email/resend";

describe("sendEmail", () => {
  it("skips the network without a key or from address", async () => {
    const fetchImpl = vi.fn();
    expect(
      await sendEmail(
        { to: "a@example.com", subject: "Hi", text: "Hello" },
        { fetchImpl, apiKey: null },
      ),
    ).toEqual({
      ok: false,
      skipped: true,
      reason: "missing_api_key",
    });
    expect(
      await sendEmail(
        { to: "a@example.com", subject: "Hi", text: "Hello" },
        { fetchImpl, apiKey: "key", from: null },
      ),
    ).toEqual({ ok: false, skipped: true, reason: "missing_from_address" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts to Resend when configured", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      void url;
      return Response.json({ id: "email_1" });
    });
    const result = await sendEmail(
      { to: "a@example.com", subject: "Hi", text: "Hello" },
      { fetchImpl, apiKey: "key", from: "Northroom <plans@example.com>" },
    );
    expect(result).toEqual({ ok: true, id: "email_1" });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe("https://api.resend.com/emails");
  });
});
