import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "../coming-soon";

export default async function TastingPage({ params }: PageProps<"/[locale]/degustacion">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");
  return <ComingSoon title={t("nav.tasting")} />;
}
