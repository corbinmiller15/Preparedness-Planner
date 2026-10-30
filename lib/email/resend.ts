export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: "missing_api_key" | "missing_from_address" }
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
 * Sends one plain email through Resend when RESEND_API_KEY and RESEND_FROM_EMAIL are set.
 * Without them, the helper returns skipped and does not call the network.
 */
export async function sendEmail(
  input: SendEmailInput,
  deps?: {
    fetchImpl?: typeof fetch;
    apiKey?: string | null;
    from?: string | null;
  },
): Promise<SendEmailResult> {
  const apiKey = configured(deps?.apiKey, process.env.RESEND_API_KEY);
  if (!apiKey) return { ok: false, skipped: true, reason: "missing_api_key" };
  const from = configured(deps?.from, process.env.RESEND_FROM_EMAIL);
  if (!from) return { ok: false, skipped: true, reason: "missing_from_address" };

  const fetchImpl = deps?.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });
  if (!response.ok) return { ok: false, skipped: false, reason: "request_failed" };
  const body = (await response.json()) as { id?: string };
  if (!body.id) return { ok: false, skipped: false, reason: "request_failed" };
  return { ok: true, id: body.id };
}
