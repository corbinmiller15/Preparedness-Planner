import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const FAILURE_TITLE = "FEMA NRI contract test failed";
export const FAILURE_LABEL = "nri-contract";
/** Repeat comments on an open outage at most once a week. */
export const FAILURE_COMMENT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
/** Present in the issue body while the workflow state is disabled_inactivity. */
export const INACTIVITY_MARKER = "disabled_inactivity";

export function labelNames(issue) {
  const labels = Array.isArray(issue?.labels) ? issue.labels : [];
  return labels
    .map((label) => (typeof label === "string" ? label : label?.name))
    .filter((name) => typeof name === "string" && name.length > 0);
}

/** One open issue with this title, preferring one that already has the label. */
export function selectIssue(issues, title, label) {
  const titled = issues.filter((issue) => issue.title === title);
  const labeled = titled.filter((issue) => labelNames(issue).includes(label));
  const pool = labeled.length > 0 ? labeled : titled;
  const open = pool.filter((issue) => String(issue.state).toLowerCase() === "open");
  const chosen = (open.length > 0 ? open : pool)
    .slice()
    .sort((left, right) => left.number - right.number);
  return chosen[0] ?? null;
}

function isOpen(issue) {
  return String(issue.state).toLowerCase() === "open";
}

function commentDue(issue, nowMs, intervalMs) {
  const updated = Date.parse(issue.updatedAt ?? "");
  return !Number.isFinite(updated) || nowMs - updated >= intervalMs;
}

export function failurePlan(outcome, issues, nowMs = Date.now()) {
  const existing = selectIssue(issues, FAILURE_TITLE, FAILURE_LABEL);
  if (outcome === "success") {
    if (existing && isOpen(existing)) return { action: "close", number: existing.number };
    return { action: "none" };
  }
  if (outcome !== "failure" && outcome !== "disabled_inactivity") return { action: "none" };
  if (!existing) return { action: "create" };
  if (!isOpen(existing)) return { action: "reopen", number: existing.number };
  const marked = String(existing.body ?? "").includes(INACTIVITY_MARKER);
  if (outcome === "disabled_inactivity" && !marked) {
    return { action: "comment", number: existing.number };
  }
  if (!commentDue(existing, nowMs, FAILURE_COMMENT_INTERVAL_MS)) return { action: "none" };
  return { action: "comment", number: existing.number };
}

export function failureBody(runUrl) {
  return [
    "The FEMA National Risk Index contract workflow failed.",
    "The run may have failed in setup or in the live county query. The query must return every field the app requests.",
    "This issue stays open while the check is failing. A later passing run closes it.",
    "Repeat comments during an outage are limited to once a week.",
    "",
    runUrl,
  ].join("\n");
}

export function failureAgainBody(runUrl) {
  return ["The FEMA National Risk Index contract workflow failed again.", "", runUrl].join("\n");
}

export function recoveryBody(runUrl) {
  return [
    "The FEMA National Risk Index contract workflow passed. Closing this issue.",
    "",
    runUrl,
  ].join("\n");
}

export function inactivityBody(runUrl) {
  return [
    "The FEMA National Risk Index contract workflow state is disabled_inactivity.",
    "This repository is public. GitHub documents that scheduled workflows in a public repository are disabled after 60 days. GitHub does not define which events count as activity.",
    "Re-enable the workflow in the Actions tab. While the schedule is still enabled, each run calls `gh workflow enable`. That call is reported to reset the timer, but GitHub does not document it. A workflow already disabled for inactivity cannot run the call.",
    "",
    runUrl,
  ].join("\n");
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function listIssues(title, label) {
  const raw = gh([
    "issue",
    "list",
    "--state",
    "all",
    "--limit",
    "20",
    "--search",
    `in:title "${title}"`,
    "--json",
    "number,title,state,updatedAt,labels,body",
  ]);
  const byTitle = JSON.parse(raw);
  let byLabel = [];
  try {
    byLabel = JSON.parse(
      gh([
        "issue",
        "list",
        "--state",
        "all",
        "--label",
        label,
        "--limit",
        "20",
        "--json",
        "number,title,state,updatedAt,labels,body",
      ]),
    );
  } catch {
    byLabel = [];
  }
  const merged = new Map();
  for (const issue of [...(Array.isArray(byTitle) ? byTitle : []), ...byLabel]) {
    if (issue && typeof issue.number === "number") merged.set(issue.number, issue);
  }
  return [...merged.values()];
}

function ensureLabel(name, color, description) {
  try {
    gh(["label", "create", name, "--color", color, "--description", description, "--force"]);
  } catch (error) {
    const message = error instanceof Error ? `${error.message}` : String(error);
    if (!/already exists/i.test(message)) throw error;
  }
}

function messageBody(outcome, runUrl, action) {
  if (outcome === "disabled_inactivity") return inactivityBody(runUrl);
  if (action === "create") return failureBody(runUrl);
  if (action === "close") return recoveryBody(runUrl);
  return failureAgainBody(runUrl);
}

function applyOutcome(outcome, runUrl) {
  const plan = failurePlan(outcome, listIssues(FAILURE_TITLE, FAILURE_LABEL));
  const body = messageBody(outcome, runUrl, plan.action);
  if (plan.action === "create") {
    gh(["issue", "create", "--title", FAILURE_TITLE, "--label", FAILURE_LABEL, "--body", body]);
    return;
  }
  if (plan.action === "comment" && plan.number) {
    gh(["issue", "comment", String(plan.number), "--body", body]);
    const edit = ["issue", "edit", String(plan.number), "--add-label", FAILURE_LABEL];
    if (outcome === "disabled_inactivity") edit.push("--body", body);
    gh(edit);
    return;
  }
  if (plan.action === "reopen" && plan.number) {
    gh(["issue", "reopen", String(plan.number)]);
    gh(["issue", "comment", String(plan.number), "--body", body]);
    const edit = ["issue", "edit", String(plan.number), "--add-label", FAILURE_LABEL];
    if (outcome === "disabled_inactivity") edit.push("--body", body);
    gh(edit);
    return;
  }
  if (plan.action === "close" && plan.number) {
    gh(["issue", "comment", String(plan.number), "--body", body]);
    gh(["issue", "close", String(plan.number), "--reason", "completed"]);
  }
}

function main() {
  const outcome = process.env.CONTRACT_OUTCOME;
  const runUrl = process.env.CONTRACT_RUN_URL ?? "";
  if (outcome !== "success" && outcome !== "failure" && outcome !== "disabled_inactivity") {
    console.error("CONTRACT_OUTCOME must be success, failure, or disabled_inactivity");
    process.exit(2);
  }
  if (!runUrl) {
    console.error("CONTRACT_RUN_URL is required");
    process.exit(2);
  }
  ensureLabel(FAILURE_LABEL, "B60205", "FEMA National Risk Index contract failure");
  applyOutcome(outcome, runUrl);
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isDirectRun()) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
