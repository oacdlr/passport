import { getTranslations } from "next-intl/server";

/** Marcador para los módulos de fases posteriores, para que el nav no rompa. */
export async function ComingSoon({ title }: { title: string }) {
  const t = await getTranslations("app");

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-4xl text-bosque sm:text-5xl">{title}</h1>
      <p className="rounded-card border border-dashed border-borde bg-white/50 px-6 py-16 text-center text-sm text-tinta-suave">
        <strong className="block font-semibold text-tinta">{t("comingSoon")}</strong>
        {t("comingSoonBody")}
      </p>
    </div>
  );
}
