import type { Locale } from "@/lib/i18n/routing";

/**
 * Los países se guardan como ISO 3166-1 alpha-2 y se muestran con
 * Intl.DisplayNames. Así "Etiopía" / "Ethiopia" salen traducidos sin pasar por
 * el LLM de traducción y sin una tabla de nombres que mantener.
 */

/** Países cafetaleros, primero en el desplegable. El resto va después, alfabético. */
export const COFFEE_ORIGINS = [
  "BR", "CO", "ET", "VN", "ID", "HN", "GT", "MX", "PE", "NI",
  "CR", "SV", "EC", "BO", "PA", "JM", "CU", "DO", "HT", "VE",
  "KE", "UG", "TZ", "RW", "BI", "CD", "CM", "CI", "MW", "ZM", "ZW", "AO",
  "IN", "PG", "YE", "TH", "LA", "MM", "PH", "CN", "TL", "NP",
] as const;

const displayNamesCache = new Map<string, Intl.DisplayNames>();

function displayNames(locale: string): Intl.DisplayNames {
  let instance = displayNamesCache.get(locale);
  if (!instance) {
    instance = new Intl.DisplayNames([locale], { type: "region", fallback: "code" });
    displayNamesCache.set(locale, instance);
  }
  return instance;
}

export function countryName(code: string, locale: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return code;
  return displayNames(locale).of(code.toUpperCase()) ?? code.toUpperCase();
}

let allCodesCache: string[] | null = null;

/** Todos los códigos de región válidos del runtime (~250), calculado una vez. */
export function allCountryCodes(): string[] {
  if (allCodesCache) return allCodesCache;

  const names = displayNames("en");
  const codes: string[] = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      // Con fallback "code", un código desconocido se devuelve tal cual.
      if (names.of(code) !== code) codes.push(code);
    }
  }
  allCodesCache = codes;
  return codes;
}

/** Códigos ordenados para un desplegable: cafetaleros arriba, resto alfabético. */
export function countryOptions(locale: string): { code: string; name: string }[] {
  const preferred = new Set<string>(COFFEE_ORIGINS);
  const rest = allCountryCodes()
    .filter((code) => !preferred.has(code))
    .map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return [
    ...COFFEE_ORIGINS.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) =>
      a.name.localeCompare(b.name, locale),
    ),
    ...rest,
  ];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const reverseCache = new Map<string, Map<string, string>>();

function reverseIndex(locale: string): Map<string, string> {
  let index = reverseCache.get(locale);
  if (index) return index;

  index = new Map<string, string>();
  for (const code of allCountryCodes()) {
    index.set(normalize(code), code);
    index.set(normalize(countryName(code, locale)), code);
  }
  reverseCache.set(locale, index);
  return index;
}

/**
 * "Colombia", "colombia", "CO", "Ethiopia", "Etiopía" -> código ISO.
 * Busca en todos los idiomas de la app, para que un CSV en inglés se importe
 * igual de bien desde la interfaz en español.
 */
export function resolveCountryCode(
  input: string,
  locales: readonly Locale[] = ["es", "en"],
): string | null {
  const needle = normalize(input);
  if (!needle) return null;

  for (const locale of locales) {
    const match = reverseIndex(locale).get(needle);
    if (match) return match;
  }
  return null;
}
