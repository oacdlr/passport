import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteUserForm } from "@/components/layout/invite-user-form";
import { RoleSelect } from "@/components/layout/role-select";
import { requireRole } from "@/features/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";

export default async function UsersPage({ params }: PageProps<"/[locale]/admin/usuarios">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const admin = await requireRole("admin");
  const t = await getTranslations("admin");

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const people = profiles ?? [];

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl text-bosque">{t("title")}</h1>
        <p className="text-sm text-tinta-suave">{t("subtitle", { count: people.length })}</p>
      </header>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-bosque">{t("inviteTitle")}</h2>
          <InviteUserForm />
          <dl className="flex flex-col gap-1 text-xs text-tinta-suave">
            {(["admin", "editor", "viewer"] as const).map((role) => (
              <div key={role} className="flex gap-2">
                <dt className="font-semibold">{t(`roles.${role}`)}:</dt>
                <dd>{t(`roleHelp.${role}`)}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <ul className="flex flex-col gap-3">
        {people.map((person) => (
          <li key={person.id}>
            <Card>
              <CardBody className="flex flex-wrap items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-terracota text-xs font-semibold text-white">
                  {initials(person.full_name, person.email)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-tinta">
                    {person.full_name ?? person.email}
                    {person.id === admin.id && <Badge tone="sage">{t("you")}</Badge>}
                  </p>
                  <p className="truncate text-xs text-tinta-suave">{person.email}</p>
                </div>

                <RoleSelect
                  userId={person.id}
                  role={person.role}
                  disabled={person.id === admin.id}
                />
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
