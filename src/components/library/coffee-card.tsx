import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DotScale } from "@/components/ui/dot-scale";
import { countryName } from "@/lib/countries";
import { originsOf, signedPhotoUrl } from "@/features/library/queries";
import type { CoffeeListItem } from "@/types/database";

/** Resumen de los orígenes: "Colombia · Huila" o "Brasil + Guatemala". */
export function originSummary(coffee: CoffeeListItem, locale: string): string {
  const origins = originsOf(coffee);
  if (origins.length === 0) return "";

  if (origins.length === 1) {
    const [origin] = origins;
    const country = countryName(origin.country_code, locale);
    return origin.region ? `${country} · ${origin.region}` : country;
  }

  return origins.map((origin) => countryName(origin.country_code, locale)).join(" + ");
}

export async function CoffeeCard({
  coffee,
  locale,
}: {
  coffee: CoffeeListItem;
  locale: string;
}) {
  const t = await getTranslations("library");
  const photo = await signedPhotoUrl(coffee.photo_path);

  return (
    <Card className="flex flex-col p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <Badge tone={coffee.kind === "blend" ? "sand" : "sage"}>{t(`kind.${coffee.kind}`)}</Badge>
        {coffee.roast && (
          <span className="text-sm text-tinta-suave">{t(`roast.${coffee.roast}`)}</span>
        )}
      </div>

      <div className="mt-3 aspect-[16/9] overflow-hidden rounded-xl bg-marfil">
        {photo ? (
          // Sin next/image: la URL está firmada y caduca, así que el optimizador
          // no puede cachearla de forma útil.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={coffee.name}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-tinta-suave/70">
            {t("fields.photo")}
          </div>
        )}
      </div>

      <h2 className="mt-4 font-display text-xl text-tinta">{coffee.name}</h2>
      <p className="text-sm text-tinta-suave">{originSummary(coffee, locale)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <DotScale label={t("fields.body")} value={coffee.body} />
        <DotScale label={t("fields.acidity")} value={coffee.acidity} />
      </div>

      <Link
        href={`/biblioteca/${coffee.slug}`}
        className="mt-4 text-sm font-semibold text-bosque underline-offset-4 hover:underline"
      >
        {t("viewProfile")} →
      </Link>
    </Card>
  );
}
