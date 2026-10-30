import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FAILURE_COMMENT_INTERVAL_MS,
  FAILURE_LABEL,
  FAILURE_TITLE,
  REMINDER_MARKER,
  failureAgainBody,
  failureBody,
  failurePlan,
  inactivityBody,
  issueLabelArgs,
  selectIssue,
} from "../../scripts/nri-contract-issue.mjs";

const now = Date.parse("2026-10-30T00:00:00.000Z");

function issue(
  number: number,
  title: string,
  label: string,
  state = "OPEN",
  createdAt = "2026-10-01T00:00:00.000Z",
  body = "",
  comments: { body?: string; createdAt?: string }[] = [],
) {
  return {
    number,
    title,
    state,
    createdAt,
    updatedAt: "2026-10-30T00:00:00.000Z",
    body,
    comments,
    labels: [{ name: label }],
  };
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

  it("waits a week after this workflow's reminder, not after other comments", () => {
    const talked = issue(12, FAILURE_TITLE, FAILURE_LABEL, "OPEN", "2026-10-01T00:00:00.000Z", "", [
      { body: "I am looking at this", createdAt: "2026-10-29T00:00:00.000Z" },
    ]);
    expect(failurePlan("failure", [talked], now)).toEqual({ action: "comment", number: 12 });

    const reminded = issue(
      12,
      FAILURE_TITLE,
      FAILURE_LABEL,
      "OPEN",
      "2026-10-01T00:00:00.000Z",
      failureBody("https://example.test/1"),
      [
        { body: "still looking", createdAt: "2026-10-29T12:00:00.000Z" },
        { body: failureAgainBody("https://example.test/2"), createdAt: "2026-10-28T00:00:00.000Z" },
      ],
    );
    expect(now - Date.parse("2026-10-28T00:00:00.000Z")).toBeLessThan(FAILURE_COMMENT_INTERVAL_MS);
    expect(failurePlan("failure", [reminded], now)).toEqual({ action: "none" });
    expect(failurePlan("disabled_inactivity", [reminded], now)).toEqual({ action: "none" });

    const stale = issue(
      12,
      FAILURE_TITLE,
      FAILURE_LABEL,
      "OPEN",
      "2026-09-01T00:00:00.000Z",
      failureBody("https://example.test/1"),
      [
        { body: failureAgainBody("https://example.test/2"), createdAt: "2026-10-01T00:00:00.000Z" },
        { body: "any update?", createdAt: "2026-10-29T00:00:00.000Z" },
      ],
    );
    expect(now - Date.parse("2026-10-01T00:00:00.000Z")).toBeGreaterThan(
      FAILURE_COMMENT_INTERVAL_MS,
    );
    expect(failurePlan("failure", [stale], now)).toEqual({ action: "comment", number: 12 });
  });

  it("appends a disabled_inactivity comment and does not replace the issue body", () => {
    expect(failurePlan("disabled_inactivity", [], now)).toEqual({ action: "create" });
    const open = issue(
      12,
      FAILURE_TITLE,
      FAILURE_LABEL,
      "OPEN",
      "2026-10-01T00:00:00.000Z",
      "The original failure description.",
    );
    expect(failurePlan("disabled_inactivity", [open], now)).toEqual({
      action: "comment",
      number: 12,
    });
    expect(issueLabelArgs(12)).toEqual(["issue", "edit", "12", "--add-label", FAILURE_LABEL]);
    expect(issueLabelArgs(12)).not.toContain("--body");
    expect(inactivityBody("https://example.test/run")).toContain(REMINDER_MARKER);
    expect(inactivityBody("https://example.test/run")).not.toContain(
      "The original failure description.",
    );
  });

  it("reads the contract workflow state from the Actions API without hiding errors", () => {
    const yaml = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(yaml).toContain(
      'gh api "repos/${GH_REPO}/actions/workflows/nri-contract.yml" --jq .state',
    );
    expect(yaml).not.toContain("workflow view");
    expect(yaml).not.toContain("2>/dev/null");
    expect(yaml).toContain(
      "github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository",
    );
    expect(yaml).toContain("::warning::");
    expect(yaml).toContain("group: nri-contract");
    const contract = readFileSync(".github/workflows/nri-contract.yml", "utf8");
    expect(contract).toContain("group: nri-contract");
  });
});
