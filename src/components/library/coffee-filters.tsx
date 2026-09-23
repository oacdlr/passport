"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { COFFEE_KINDS, PROCESS_METHODS, ROAST_LEVELS } from "@/features/library/schema";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * Los filtros viven en la URL, no en estado local: así un filtro se puede
 * compartir por chat y sobrevive a recargar la página.
 */
export function CoffeeFilters({ countries }: { countries: Option[] }) {
  const t = useTranslations("library");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  const selects: { key: string; label: string; options: Option[] }[] = [
    { key: "country", label: t("filters.origin"), options: countries },
    {
      key: "roast",
      label: t("filters.roast"),
      options: ROAST_LEVELS.map((value) => ({ value, label: t(`roast.${value}`) })),
    },
    {
      key: "process",
      label: t("filters.process"),
      options: PROCESS_METHODS.map((value) => ({ value, label: t(`process.${value}`) })),
    },
    {
      key: "kind",
      label: t("filters.kind"),
      options: COFFEE_KINDS.map((value) => ({ value, label: t(`kind.${value}`) })),
    },
  ];

  const hasFilters = ["q", "country", "roast", "process", "kind"].some((key) =>
    searchParams.get(key),
  );

  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row", pending && "opacity-70")}>
      <label className="relative flex-1">
        <span className="sr-only">{t("search")}</span>
        <input
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder={t("search")}
          onChange={(event) => update("q", event.target.value)}
          className="w-full rounded-full border border-borde bg-white px-5 py-3 text-sm placeholder:text-tinta-suave/70 focus:border-bosque focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {selects.map((select) => (
          <label key={select.key} className="relative">
            <span className="sr-only">{select.label}</span>
            <select
              value={searchParams.get(select.key) ?? ""}
              onChange={(event) => update(select.key, event.target.value)}
              className={cn(
                "appearance-none rounded-full border border-borde bg-white px-5 py-3 text-sm focus:border-bosque focus:outline-none",
                searchParams.get(select.key) && "border-bosque font-medium text-bosque",
              )}
            >
              <option value="">{select.label}</option>
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {hasFilters && (
          <button
            type="button"
            onClick={() => startTransition(() => router.replace(pathname))}
            className="rounded-full px-4 py-3 text-sm text-tinta-suave underline underline-offset-4"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
