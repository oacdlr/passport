import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CoffeeCard } from "@/components/library/coffee-card";
import { CoffeeFilters } from "@/components/library/coffee-filters";
import { countCoffees, listCoffees, listUsedCountryCodes } from "@/features/library/queries";
import { canEditLibrary, requireUser } from "@/features/auth/guards";
import { countryName } from "@/lib/countries";

export default async function LibraryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/biblioteca">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const t = await getTranslations("library");
  const user = await requireUser();

  const readParam = (key: string) => (typeof query[key] === "string" ? query[key] : undefined);

  const [coffees, total, usedCountries] = await Promise.all([
    listCoffees({
      q: readParam("q"),
      country: readParam("country"),
      roast: readParam("roast"),
      process: readParam("process"),
      kind: readParam("kind"),
    }),
    countCoffees(),
    listUsedCountryCodes(),
  ]);

  const canEdit = canEditLibrary(user.profile.role);
  const isFiltered = ["q", "country", "roast", "process", "kind"].some((key) => readParam(key));

  const countryOptions = usedCountries
    .map((code) => ({ value: code, label: countryName(code, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-bosque sm:text-5xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-tinta-suave">{t("count", { count: total })}</p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/biblioteca/importar">{t("importCsv")}</Link>
            </Button>
            <Button asChild>
              <Link href="/biblioteca/nuevo">{t("addCoffee")}</Link>
            </Button>
          </div>
        )}
      </header>

      <CoffeeFilters countries={countryOptions} />

      {coffees.length === 0 ? (
        <p className="rounded-card border border-dashed border-borde bg-white/50 px-6 py-16 text-center text-sm text-tinta-suave">
          {isFiltered ? t("empty") : t("emptyAll")}
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {coffees.map((coffee) => (
            <li key={coffee.id}>
              <CoffeeCard coffee={coffee} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
