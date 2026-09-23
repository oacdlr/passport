import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "../coming-soon";

export default async function DraftsPage({ params }: PageProps<"/[locale]/drafts">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");
  return <ComingSoon title={t("nav.drafts")} />;
}
