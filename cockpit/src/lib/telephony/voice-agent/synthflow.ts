// SLC-515 / MT-2 — Synthflow Voice-Agent Adapter (Placeholder)
// Implement at go-live when Synthflow is evaluated as alternative provider.

import type { VoiceAgentCallResult, VoiceAgentProvider } from "./provider";

export class SynthflowProvider implements VoiceAgentProvider {
  getProviderName(): string {
    return "synthflow";
  }

  validateWebhook(): boolean {
    throw new Error("SynthflowProvider.validateWebhook not implemented");
  }

  parsePayload(): VoiceAgentCallResult {
    throw new Error("SynthflowProvider.parsePayload not implemented");
  }
}
