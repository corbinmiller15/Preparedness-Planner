export const FAILURE_TITLE: string;
export const FAILURE_LABEL: string;
export const FAILURE_COMMENT_INTERVAL_MS: number;
export const INACTIVITY_MARKER: string;

export type ContractIssue = {
  number: number;
  title: string;
  state: string;
  updatedAt?: string;
  body?: string;
  labels?: Array<string | { name?: string }>;
};

export type ContractOutcome = "success" | "failure" | "disabled_inactivity";

export function labelNames(issue: ContractIssue): string[];

export function selectIssue(
  issues: readonly ContractIssue[],
  title: string,
  label: string,
): ContractIssue | null;

export function failurePlan(
  outcome: ContractOutcome,
  issues: readonly ContractIssue[],
  nowMs?: number,
):
  | { action: "create" }
  | { action: "comment" | "reopen" | "close"; number: number }
  | { action: "none" };
