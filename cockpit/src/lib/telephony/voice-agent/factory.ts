// SLC-515 / MT-2 — Voice-Agent Factory (FEAT-514, DEC-075)
// Selects provider based on VOICE_AGENT_PROVIDER env. Defaults to SMAO.

import type { VoiceAgentProvider } from "./provider";
import { SmaoProvider } from "./smao";
import { SynthflowProvider } from "./synthflow";

export function getVoiceAgentProvider(): VoiceAgentProvider {
  switch (process.env.VOICE_AGENT_PROVIDER) {
    case "synthflow":
      return new SynthflowProvider();
    case "smao":
    default:
      return new SmaoProvider();
  }
}
