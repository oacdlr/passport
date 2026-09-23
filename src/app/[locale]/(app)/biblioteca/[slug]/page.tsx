import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DotScale } from "@/components/ui/dot-scale";
import { DeleteCoffeeButton } from "@/components/library/delete-coffee-button";
import { canDeleteLibrary, canEditLibrary, requireUser } from "@/features/auth/guards";
import { getCoffeeBySlug, originsOf, signedPhotoUrl } from "@/features/library/queries";
import { countryName } from "@/lib/countries";

export default async function CoffeeDetailPage({
  params,
}: PageProps<"/[locale]/biblioteca/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("library");
  const user = await requireUser();

  const coffee = await getCoffeeBySlug(slug);
  if (!coffee) notFound();

  const photo = await signedPhotoUrl(coffee.photo_path);
  const origins = originsOf(coffee);
  const extra =
    coffee.extra && typeof coffee.extra === "object" && !Array.isArray(coffee.extra)
      ? (coffee.extra as Record<string, unknown>)
      : {};

  return (
    <article className="flex flex-col gap-8">
      <Link
        href="/biblioteca"
        className="text-sm text-tinta-suave underline-offset-4 hover:underline"
      >
        ← {t("detail.back")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={coffee.kind === "blend" ? "sand" : "sage"}>
              {t(`kind.${coffee.kind}`)}
            </Badge>
            {coffee.roast && (
              <span className="text-sm text-tinta-suave">{t(`roast.${coffee.roast}`)}</span>
            )}
            {coffee.process && (
              <span className="text-sm text-tinta-suave">{t(`process.${coffee.process}`)}</span>
            )}
          </div>
          <h1 className="font-display text-4xl text-bosque sm:text-5xl">{coffee.name}</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          {canEditLibrary(user.profile.role) && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/biblioteca/${coffee.slug}/editar`}>{t("detail.edit")}</Link>
            </Button>
          )}
          {canDeleteLibrary(user.profile.role) && (
            <DeleteCoffeeButton id={coffee.id} name={coffee.name} />
          )}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          {photo && (
            <div className="aspect-[16/9] overflow-hidden rounded-card bg-marfil">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={coffee.name} className="size-full object-cover" />
            </div>
          )}

          {coffee.story && (
            <section className="flex flex-col gap-2">
              <h2 className="font-display text-xl text-bosque">{t("detail.story")}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-tinta">
                {coffee.story}
              </p>
            </section>
          )}

          {coffee.tasting_notes.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-display text-xl text-bosque">{t("detail.notes")}</h2>
              <ul className="flex flex-wrap gap-2">
                {coffee.tasting_notes.map((note) => (
                  <li key={note} className="rounded-full bg-salvia px-3 py-1.5 text-sm text-bosque">
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {coffee.complementary_flavors.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-display text-xl text-bosque">{t("detail.complementary")}</h2>
              <ul className="flex flex-wrap gap-2">
                {coffee.complementary_flavors.map((flavor) => (
                  <li
                    key={flavor}
                    className="rounded-full bg-arena px-3 py-1.5 text-sm text-[#8a5a2b]"
                  >
                    {flavor}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Hueco del milestone 3: aquí entrarán las degustaciones de este café. */}
          <p className="rounded-card border border-dashed border-borde px-5 py-6 text-sm text-tinta-suave">
            {t("detail.tastingsSoon")}
          </p>
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardBody className="flex flex-col gap-3">
              <h2 className="font-display text-lg text-bosque">{t("detail.profile")}</h2>
              <DotScale label={t("fields.body")} value={coffee.body} />
              <DotScale label={t("fields.acidity")} value={coffee.acidity} />
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <h2 className="font-display text-lg text-bosque">{t("detail.origins")}</h2>
              <ul className="flex flex-col gap-3">
                {origins.map((origin) => (
                  <li key={origin.position} className="text-sm">
                    <p className="font-medium text-tinta">
                      {countryName(origin.country_code, locale)}
                      {origin.region ? ` · ${origin.region}` : ""}
                    </p>
                    {origin.producer && <p className="text-tinta-suave">{origin.producer}</p>}
                    {origin.farm && <p className="text-tinta-suave">{origin.farm}</p>}
                    {origin.altitude_masl != null && (
                      <p className="text-tinta-suave">{origin.altitude_masl} msnm</p>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {Object.keys(extra).length > 0 && (
            <Card>
              <CardBody className="flex flex-col gap-2">
                <h2 className="font-display text-lg text-bosque">{t("detail.extra")}</h2>
                <dl className="flex flex-col gap-1.5 text-sm">
                  {Object.entries(extra).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt className="text-tinta-suave">{key}</dt>
                      <dd className="text-right text-tinta">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </article>
  );
}
