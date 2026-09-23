import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardBody } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const t = await getTranslations("auth");

  const next = typeof query.next === "string" ? query.next : undefined;
  const linkError = query.error === "link";

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl text-bosque">{t("title")}</h1>
          <p className="mt-2 text-sm text-tinta-suave">{t("subtitle")}</p>
        </div>
        <Card>
          <CardBody className="p-6 sm:p-8">
            <LoginForm next={next} linkError={linkError} />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
