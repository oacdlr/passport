import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Card, CardBody } from "@/components/ui/card";

export default async function CheckEmailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/revisa-tu-correo">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const t = await getTranslations("auth");
  const email = typeof query.email === "string" ? query.email : "";

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardBody className="p-6 text-center sm:p-8">
          <h1 className="font-display text-2xl text-bosque">{t("checkEmail")}</h1>
          <p className="mt-3 text-sm text-tinta-suave">{t("checkEmailBody", { email })}</p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-semibold text-bosque underline underline-offset-4"
          >
            {t("backToLogin")}
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}
