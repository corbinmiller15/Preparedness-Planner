import { describe, expect, it } from "vitest";
import {
  FAILURE_COMMENT_INTERVAL_MS,
  FAILURE_LABEL,
  FAILURE_TITLE,
  INACTIVITY_MARKER,
  failurePlan,
  selectIssue,
} from "../../scripts/nri-contract-issue.mjs";

const now = Date.parse("2026-10-30T00:00:00.000Z");

function issue(
  number: number,
  title: string,
  label: string,
  state = "OPEN",
  updatedAt = "2026-10-01T00:00:00.000Z",
  body = "",
) {
  return { number, title, state, updatedAt, body, labels: [{ name: label }] };
}

describe("FEMA contract issue", () => {
  it("opens one failure issue and later comments, reopens, or closes that issue", () => {
    expect(failurePlan("failure", [], now)).toEqual({ action: "create" });
    const open = issue(12, FAILURE_TITLE, FAILURE_LABEL);
    expect(failurePlan("failure", [open], now)).toEqual({ action: "comment", number: 12 });
    expect(failurePlan("success", [open], now)).toEqual({ action: "close", number: 12 });
    expect(failurePlan("failure", [{ ...open, state: "CLOSED" }], now)).toEqual({
      action: "reopen",
      number: 12,
    });
    expect(failurePlan("success", [{ ...open, state: "CLOSED" }], now)).toEqual({
      action: "none",
    });
    expect(failurePlan("success", [], now)).toEqual({ action: "none" });
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

  it("comments on an open outage at most once a week", () => {
    const recent = issue(12, FAILURE_TITLE, FAILURE_LABEL, "OPEN", "2026-10-28T00:00:00.000Z");
    expect(now - Date.parse(recent.updatedAt)).toBeLessThan(FAILURE_COMMENT_INTERVAL_MS);
    expect(failurePlan("failure", [recent], now)).toEqual({ action: "none" });
    const stale = issue(12, FAILURE_TITLE, FAILURE_LABEL, "OPEN", "2026-10-01T00:00:00.000Z");
    expect(now - Date.parse(stale.updatedAt)).toBeGreaterThan(FAILURE_COMMENT_INTERVAL_MS);
    expect(failurePlan("failure", [stale], now)).toEqual({ action: "comment", number: 12 });
  });

  it("uses the same issue when the schedule is disabled_inactivity", () => {
    expect(failurePlan("disabled_inactivity", [], now)).toEqual({ action: "create" });
    const failureIssue = issue(
      12,
      FAILURE_TITLE,
      FAILURE_LABEL,
      "OPEN",
      "2026-10-29T00:00:00.000Z",
    );
    expect(failurePlan("disabled_inactivity", [failureIssue], now)).toEqual({
      action: "comment",
      number: 12,
    });
    const marked = issue(
      12,
      FAILURE_TITLE,
      FAILURE_LABEL,
      "OPEN",
      "2026-10-29T00:00:00.000Z",
      `state ${INACTIVITY_MARKER}`,
    );
    expect(failurePlan("disabled_inactivity", [marked], now)).toEqual({ action: "none" });
    const stale = issue(
      12,
      FAILURE_TITLE,
      FAILURE_LABEL,
      "OPEN",
      "2026-10-01T00:00:00.000Z",
      `state ${INACTIVITY_MARKER}`,
    );
    expect(failurePlan("disabled_inactivity", [stale], now)).toEqual({
      action: "comment",
      number: 12,
    });
  });
});
