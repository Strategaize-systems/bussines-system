// SLC-515 — Voice-Agent Module Entry
export type {
  VoiceAgentCallResult,
  VoiceAgentClassification,
  VoiceAgentProvider,
} from "./provider";
export { SmaoProvider } from "./smao";
export { SynthflowProvider } from "./synthflow";
export { getVoiceAgentProvider } from "./factory";
