export const FAILURE_TITLE: string;
export const FAILURE_LABEL: string;
export const FAILURE_COMMENT_INTERVAL_MS: number;
export const REMINDER_MARKER: string;
export const DISABLED_MARKER: string;
export const COMMENT_LOOKBACK_MS: number;

export type ContractComment = {
  body?: string;
  createdAt?: string;
};

export type ContractIssue = {
  number: number;
  title: string;
  state: string;
  createdAt?: string;
  body?: string;
  comments?: ContractComment[];
  labels?: Array<string | { name?: string }>;
};

export type ContractOutcome = "success" | "failure" | "disabled_inactivity";

export function labelNames(issue: ContractIssue): string[];

export function selectIssue(
  issues: readonly ContractIssue[],
  title: string,
  label: string,
): ContractIssue | null;

export function lastReminderAt(issue: ContractIssue): number | null;

export function failurePlan(
  outcome: ContractOutcome,
  issues: readonly ContractIssue[],
  nowMs?: number,
):
  | { action: "create" }
  | { action: "comment" | "reopen" | "close"; number: number }
  | { action: "none" };

export function issueLabelArgs(number: number): string[];

export function failureBody(runUrl: string): string;

export function failureAgainBody(runUrl: string): string;

export function inactivityBody(runUrl: string): string;

export function parseCommentList(raw: string): Array<{ createdAt?: string; body?: string }>;

export function commentPagePath(number: number, page: number, nowMs?: number): string;

export function collectCommentPages(
  fetchPage: (page: number) => string,
): Array<{ createdAt?: string; body?: string }>;
