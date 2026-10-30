export const FAILURE_TITLE: string;
export const FAILURE_LABEL: string;
export const FAILURE_COMMENT_INTERVAL_MS: number;
export const REMINDER_MARKER: string;

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
