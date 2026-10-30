import { describe, expect, it } from "vitest";
import {
  KEEPALIVE_LABEL,
  KEEPALIVE_MAX_AGE_MS,
  KEEPALIVE_TITLE,
  FAILURE_LABEL,
  FAILURE_TITLE,
  failurePlan,
  keepalivePlan,
  selectIssue,
} from "../../scripts/nri-contract-issue.mjs";

function issue(
  number: number,
  title: string,
  label: string,
  state = "OPEN",
  updatedAt = "2026-10-01T00:00:00.000Z",
) {
  return { number, title, state, updatedAt, labels: [{ name: label }] };
}

describe("FEMA contract issue", () => {
  it("opens one failure issue and later comments, reopens, or closes that issue", () => {
    expect(failurePlan("failure", [])).toEqual({ action: "create" });
    const open = issue(12, FAILURE_TITLE, FAILURE_LABEL);
    expect(failurePlan("failure", [open])).toEqual({ action: "comment", number: 12 });
    expect(failurePlan("success", [open])).toEqual({ action: "close", number: 12 });
    expect(failurePlan("failure", [{ ...open, state: "CLOSED" }])).toEqual({
      action: "reopen",
      number: 12,
    });
    expect(failurePlan("success", [{ ...open, state: "CLOSED" }])).toEqual({ action: "none" });
    expect(failurePlan("success", [])).toEqual({ action: "none" });
  });

  it("dedupes by title and label and keeps the open issue", () => {
    const chosen = selectIssue(
      [
        issue(4, FAILURE_TITLE, "other"),
        issue(9, FAILURE_TITLE, FAILURE_LABEL, "CLOSED"),
        issue(8, FAILURE_TITLE, FAILURE_LABEL, "OPEN"),
        issue(3, "Something else", FAILURE_LABEL),
      ],
      FAILURE_TITLE,
      FAILURE_LABEL,
    );
    expect(chosen?.number).toBe(8);
  });

  it("refreshes the keepalive issue on a 30-day cadence and reopens it", () => {
    const now = Date.parse("2026-10-30T00:00:00.000Z");
    expect(keepalivePlan([], now)).toEqual({ action: "create" });
    const fresh = issue(2, KEEPALIVE_TITLE, KEEPALIVE_LABEL, "OPEN", "2026-10-20T00:00:00.000Z");
    expect(keepalivePlan([fresh], now)).toEqual({ action: "none" });
    const stale = issue(2, KEEPALIVE_TITLE, KEEPALIVE_LABEL, "OPEN", "2026-09-01T00:00:00.000Z");
    expect(now - Date.parse(stale.updatedAt)).toBeGreaterThan(KEEPALIVE_MAX_AGE_MS);
    expect(keepalivePlan([stale], now)).toEqual({ action: "refresh", number: 2, reopen: false });
    expect(keepalivePlan([{ ...fresh, state: "CLOSED" }], now)).toEqual({
      action: "refresh",
      number: 2,
      reopen: true,
    });
  });
});
