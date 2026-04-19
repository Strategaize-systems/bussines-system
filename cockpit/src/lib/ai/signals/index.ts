// =============================================================
// Signal Module — Public API (SLC-432, SLC-434)
// =============================================================

export { extractSignals } from "./extractor";
export type { SignalResult, SignalSourceType } from "./extractor";
export type { ExtractedSignal, SignalDealContext } from "./prompts";
export { applyProposedChange } from "./applier";
export type { ApplyResult } from "./applier";
