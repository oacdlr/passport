import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoffeeForm } from "@/components/library/coffee-form";
import { requireRole } from "@/features/auth/guards";
import { getCoffeeBySlug, signedPhotoUrl } from "@/features/library/queries";

export default async function EditCoffeePage({
  params,
}: PageProps<"/[locale]/biblioteca/[slug]/editar">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  await requireRole("admin", "editor");
  const t = await getTranslations("library");

  const coffee = await getCoffeeBySlug(slug);
  if (!coffee) notFound();

  const photoUrl = await signedPhotoUrl(coffee.photo_path);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-4xl text-bosque">{t("form.editTitle")}</h1>
      <CoffeeForm coffee={coffee} photoUrl={photoUrl} />
    </div>
  );
}
