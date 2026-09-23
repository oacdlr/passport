import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoffeeForm } from "@/components/library/coffee-form";
import { requireRole } from "@/features/auth/guards";
import { countryOptions } from "@/lib/countries";

export default async function NewCoffeePage({ params }: PageProps<"/[locale]/biblioteca/nuevo">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Viewer no llega aquí; la RLS lo rechazaría igualmente.
  await requireRole("admin", "editor");
  const t = await getTranslations("library");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-4xl text-bosque">{t("form.newTitle")}</h1>
      <CoffeeForm countries={countryOptions(locale)} />
    </div>
  );
}
