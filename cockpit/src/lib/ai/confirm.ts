// =============================================================
// Confirm-before-write — Utility for future Action Mode (V3.1)
// =============================================================
//
// This module provides the type-safe structure for the confirm-before-write
// pattern. When the AI suggests an action (e.g., create task, update deal),
// the action is wrapped in a ConfirmAction that the UI presents to the user
// for approval before execution.
//
// Currently: utility logic and types only. No UI in this slice.
// UI will be added in SLC-307/SLC-308.

import type { ConfirmAction, ConfirmActionType, ConfirmResult } from "./types";

/**
 * Creates a ConfirmAction object from the AI's suggested action.
 *
 * @param type - The type of action (create-task, update-deal, etc.)
 * @param data - Structured data for the action
 * @param preview - Human-readable preview of what will happen
 * @returns ConfirmAction ready for UI presentation
 */
export function createConfirmAction(
  type: ConfirmActionType,
  data: Record<string, unknown>,
  preview: string
): ConfirmAction {
  return {
    type,
    data,
    preview,
  };
}

/**
 * Creates a confirmed result (user approved the action).
 */
export function confirmAction(action: ConfirmAction): ConfirmResult {
  return {
    confirmed: true,
    action,
  };
}

/**
 * Creates a rejected result (user declined the action).
 */
export function rejectAction(action: ConfirmAction): ConfirmResult {
  return {
    confirmed: false,
    action,
  };
}

/**
 * Type guard to check if a ConfirmResult was approved.
 */
export function isConfirmed(result: ConfirmResult): boolean {
  return result.confirmed;
}
