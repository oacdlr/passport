/**
 * Contratos de la capa de IA.
 *
 * La lógica de negocio habla sólo con estos tipos, nunca con el SDK de un
 * proveedor. Cambiar de Anthropic a Gemini, o a un modelo local con Ollama,
 * debe ser cambiar variables de entorno y añadir un adaptador — nunca tocar
 * Degustación, Drafts ni la traducción.
 */

/** Las tres tareas de IA del producto. Cada una se configura por separado. */
export type AiTask = "copilot" | "vision" | "translation";

export type AiProvider = "anthropic" | "google" | "ollama";

export type AiTaskConfig = {
  provider: AiProvider;
  model: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Copiloto de Drafts: conversación con contexto de Biblioteca y Degustaciones. */
export type CopilotAdapter = {
  chat(input: {
    system: string;
    messages: ChatMessage[];
    signal?: AbortSignal;
  }): AsyncIterable<string>;
};

/** Lectura de la foto de la bolsa para autocompletar la cata. */
export type VisionAdapter = {
  readCoffeeBag(input: {
    image: { data: string; mediaType: string };
    locale: string;
  }): Promise<{ name?: string; origin?: string; roast?: string; notes?: string[] }>;
};

/** Traducción de contenido de Biblioteca y Academy, con cache en base de datos. */
export type TranslationAdapter = {
  translate(input: {
    text: string;
    from: string;
    to: string;
  }): Promise<string>;
};

export type AdapterFor<T extends AiTask> = T extends "copilot"
  ? CopilotAdapter
  : T extends "vision"
    ? VisionAdapter
    : TranslationAdapter;
