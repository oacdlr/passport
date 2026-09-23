import { defineRouting } from "next-intl/routing";

export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Siempre con prefijo: /es/biblioteca, /en/biblioteca.
  localePrefix: "always",
  // La cookie deja que el LocaleSwitcher recuerde la preferencia de invitados
  // (para usuarios con sesión manda profiles.locale).
  localeCookie: { name: "PASAPORTE_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
