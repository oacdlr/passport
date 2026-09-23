"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, type Locale } from "@/lib/i18n/routing";
import { setPreferredLocale } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(locale: Locale) {
    if (locale === current) return;
    startTransition(() => {
      // El idioma viaja con el usuario entre dispositivos, no sólo en la cookie.
      void setPreferredLocale(locale);
      router.replace(pathname, { locale });
    });
  }

  return (
    <div
      className="flex items-center rounded-full border border-white/25 bg-white/10 p-0.5"
      role="group"
      aria-label="Idioma / Language"
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={pending}
          aria-pressed={locale === current}
          onClick={() => switchTo(locale)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors",
            locale === current ? "bg-crema text-bosque" : "text-crema/80 hover:text-white",
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
