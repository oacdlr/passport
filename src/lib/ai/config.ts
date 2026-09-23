import "server-only";

import type { AiProvider, AiTask, AiTaskConfig } from "./types";

/**
 * Mapa tarea -> proveedor/modelo, leído íntegramente del entorno.
 *
 * No hay modelos por defecto a propósito: `CLAUDE.md` exige que proveedor y
 * modelo sean siempre configurables y que nada quede hardcodeado, para poder
 * cambiar de proveedor — o pasarse a un modelo local — sin tocar lógica de
 * negocio. Los valores sugeridos están en el README.
 */

const PROVIDERS: AiProvider[] = ["anthropic", "google", "ollama"];

const ENV_KEYS: Record<AiTask, { provider: string; model: string }> = {
  copilot: { provider: "AI_COPILOT_PROVIDER", model: "AI_COPILOT_MODEL" },
  vision: { provider: "AI_VISION_PROVIDER", model: "AI_VISION_MODEL" },
  translation: { provider: "AI_TRANSLATION_PROVIDER", model: "AI_TRANSLATION_MODEL" },
};

/** Credencial que necesita cada proveedor. Ollama es local y no lleva key. */
const CREDENTIAL_KEYS: Record<AiProvider, string | null> = {
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  ollama: null,
};

export function aiConfig(task: AiTask): AiTaskConfig {
  const keys = ENV_KEYS[task];
  const provider = process.env[keys.provider];
  const model = process.env[keys.model];

  if (!provider || !model) {
    throw new Error(
      `Falta configurar la IA para la tarea "${task}": define ${keys.provider} y ${keys.model} en .env.local.`,
    );
  }

  if (!PROVIDERS.includes(provider as AiProvider)) {
    throw new Error(
      `${keys.provider}="${provider}" no es un proveedor válido. Usa: ${PROVIDERS.join(", ")}.`,
    );
  }

  return { provider: provider as AiProvider, model };
}

export function credentialFor(provider: AiProvider): string | null {
  const key = CREDENTIAL_KEYS[provider];
  if (!key) return null;

  const value = process.env[key];
  if (!value) {
    throw new Error(`Falta ${key} en .env.local para usar el proveedor "${provider}".`);
  }
  return value;
}

/** Base URL del runtime local, sólo relevante para Ollama. */
export function ollamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
}
