"use client";

import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "./field";

/**
 * Entrada de tags tipo "notas de cata". Escribir + Enter añade; Backspace en
 * vacío quita el último. Publica el valor en inputs ocultos para que el form
 * funcione con Server Actions sin JSON intermedio.
 */
export function TagInput({
  name,
  value,
  onChange,
  placeholder,
  className,
}: {
  name: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="inline-flex items-center gap-1.5 rounded-full bg-bosque px-3 py-1.5 text-sm text-white"
              >
                {tag}
                <span aria-hidden className="text-white/70">
                  ×
                </span>
                <span className="sr-only">Quitar</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        className={inputClass}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
      />
      {value.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}
    </div>
  );
}
