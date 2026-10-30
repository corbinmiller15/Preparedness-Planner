import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const FAILURE_TITLE = "FEMA NRI contract test failed";
export const FAILURE_LABEL = "nri-contract";
export const KEEPALIVE_TITLE = "Keep scheduled workflows active";
export const KEEPALIVE_LABEL = "schedule-keepalive";
/** Refresh well inside GitHub's 60-day pause for public scheduled workflows. */
export const KEEPALIVE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

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

export function failurePlan(outcome, issues) {
  const existing = selectIssue(issues, FAILURE_TITLE, FAILURE_LABEL);
  if (outcome === "failure") {
    if (!existing) return { action: "create" };
    if (String(existing.state).toLowerCase() === "open") {
      return { action: "comment", number: existing.number };
    }
    return { action: "reopen", number: existing.number };
  }
  if (outcome === "success" && existing && String(existing.state).toLowerCase() === "open") {
    return { action: "close", number: existing.number };
  }
  return { action: "none" };
}

export function keepalivePlan(issues, nowMs, maxAgeMs = KEEPALIVE_MAX_AGE_MS) {
  const existing = selectIssue(issues, KEEPALIVE_TITLE, KEEPALIVE_LABEL);
  if (!existing) return { action: "create" };
  const updated = Date.parse(existing.updatedAt ?? "");
  const stale = !Number.isFinite(updated) || nowMs - updated >= maxAgeMs;
  const closed = String(existing.state).toLowerCase() !== "open";
  if (!stale && !closed) return { action: "none" };
  return { action: "refresh", number: existing.number, reopen: closed };
}

export function failureBody(runUrl) {
  return [
    "The scheduled FEMA National Risk Index contract test failed.",
    "The county query did not return every field the app requests.",
    "This issue stays open while the check is failing. A later passing run closes it.",
    "",
    runUrl,
  ].join("\n");
}

export function failureAgainBody(runUrl) {
  return ["The FEMA National Risk Index contract test failed again.", "", runUrl].join("\n");
}

export function recoveryBody(runUrl) {
  return [
    "The FEMA National Risk Index contract test passed. Closing this issue.",
    "",
    runUrl,
  ].join("\n");
}

export function keepaliveBody(runUrl, nowIso) {
  return [
    "GitHub disables scheduled workflows in a public repository after 60 days without activity (a push, an issue, or a pull request).",
    "The FEMA contract workflow refreshes this issue at least every 30 days so that daily schedule is not paused.",
    "This is not a product bug.",
    "",
    `Last refreshed: ${nowIso}`,
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
    "number,title,state,updatedAt,labels",
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
        "number,title,state,updatedAt,labels",
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

function applyFailure(outcome, runUrl) {
  const plan = failurePlan(outcome, listIssues(FAILURE_TITLE, FAILURE_LABEL));
  if (plan.action === "create") {
    gh([
      "issue",
      "create",
      "--title",
      FAILURE_TITLE,
      "--label",
      FAILURE_LABEL,
      "--body",
      failureBody(runUrl),
    ]);
    return;
  }
  if (plan.action === "comment" && plan.number) {
    gh(["issue", "comment", String(plan.number), "--body", failureAgainBody(runUrl)]);
    gh(["issue", "edit", String(plan.number), "--add-label", FAILURE_LABEL]);
    return;
  }
  if (plan.action === "reopen" && plan.number) {
    gh(["issue", "reopen", String(plan.number)]);
    gh(["issue", "comment", String(plan.number), "--body", failureAgainBody(runUrl)]);
    gh(["issue", "edit", String(plan.number), "--add-label", FAILURE_LABEL]);
    return;
  }
  if (plan.action === "close" && plan.number) {
    gh(["issue", "comment", String(plan.number), "--body", recoveryBody(runUrl)]);
    gh(["issue", "close", String(plan.number), "--reason", "completed"]);
  }
}

function applyKeepalive(runUrl, nowMs) {
  const plan = keepalivePlan(listIssues(KEEPALIVE_TITLE, KEEPALIVE_LABEL), nowMs);
  const body = keepaliveBody(runUrl, new Date(nowMs).toISOString());
  if (plan.action === "create") {
    gh(["issue", "create", "--title", KEEPALIVE_TITLE, "--label", KEEPALIVE_LABEL, "--body", body]);
    return;
  }
  if (plan.action === "refresh" && plan.number) {
    if (plan.reopen) gh(["issue", "reopen", String(plan.number)]);
    gh(["issue", "edit", String(plan.number), "--add-label", KEEPALIVE_LABEL, "--body", body]);
  }
}

function main() {
  const outcome = process.env.CONTRACT_OUTCOME;
  const runUrl = process.env.CONTRACT_RUN_URL ?? "";
  if (outcome !== "success" && outcome !== "failure") {
    console.error("CONTRACT_OUTCOME must be success or failure");
    process.exit(2);
  }
  if (!runUrl) {
    console.error("CONTRACT_RUN_URL is required");
    process.exit(2);
  }
  ensureLabel(FAILURE_LABEL, "B60205", "FEMA National Risk Index contract failure");
  ensureLabel(KEEPALIVE_LABEL, "5319E7", "Keeps scheduled workflows from pausing after 60 days");
  applyFailure(outcome, runUrl);
  applyKeepalive(runUrl, Date.now());
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
