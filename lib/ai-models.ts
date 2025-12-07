import { ModelConfig } from "@/components/AiChat";

export const googleModels: readonly ModelConfig[] = [
  { name: "Gemini 2.5 Flash", value: "gemini-2.5-flash", provider: "Google" },
  { name: "Gemini 2.0 Pro", value: "gemini-2.0-pro", provider: "Google" }
] as const;

export const perplexityModels: readonly ModelConfig[] = [
  { name: "Sonar", value: "sonar", provider: "Perplexity" },
  { name: "Sonar Pro", value: "sonar-pro", provider: "Perplexity" }
] as const;

export const openaiModels: readonly ModelConfig[] = [
  { name: "GPT-4o", value: "gpt-4o", provider: "OpenAI" },
  { name: "GPT-4o Mini", value: "gpt-4o-mini", provider: "OpenAI" }
] as const;

export const allModels: readonly ModelConfig[] = [
  ...googleModels,
  ...perplexityModels,
  ...openaiModels
] as const;
