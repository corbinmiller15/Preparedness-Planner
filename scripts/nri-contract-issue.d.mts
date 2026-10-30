export const FAILURE_TITLE: string;
export const FAILURE_LABEL: string;
export const KEEPALIVE_TITLE: string;
export const KEEPALIVE_LABEL: string;
export const KEEPALIVE_MAX_AGE_MS: number;

export type ContractIssue = {
  number: number;
  title: string;
  state: string;
  updatedAt?: string;
  labels?: Array<string | { name?: string }>;
};

export function labelNames(issue: ContractIssue): string[];

export function selectIssue(
  issues: readonly ContractIssue[],
  title: string,
  label: string,
): ContractIssue | null;

export function failurePlan(
  outcome: "success" | "failure",
  issues: readonly ContractIssue[],
):
  | { action: "create" }
  | { action: "comment" | "reopen" | "close"; number: number }
  | { action: "none" };

export function keepalivePlan(
  issues: readonly ContractIssue[],
  nowMs: number,
  maxAgeMs?: number,
):
  | { action: "create" }
  | { action: "refresh"; number: number; reopen: boolean }
  | { action: "none" };
