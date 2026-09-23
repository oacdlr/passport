import { getTranslations, setRequestLocale } from "next-intl/server";
import { ImportWizard } from "@/components/library/import-wizard";
import { requireRole } from "@/features/auth/guards";

export default async function ImportPage({ params }: PageProps<"/[locale]/biblioteca/importar">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // El import masivo es de editor y admin (decisión de alcance del rol Editor).
  await requireRole("admin", "editor");
  const t = await getTranslations("library.import");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl text-bosque">{t("title")}</h1>
        <p className="text-sm text-tinta-suave">{t("subtitle")}</p>
      </header>
      <ImportWizard />
    </div>
  );
}
