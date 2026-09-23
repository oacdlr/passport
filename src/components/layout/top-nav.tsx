import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getSessionUser } from "@/features/auth/guards";
import { canManageUsers } from "@/features/auth/guards";
import { LocaleSwitcher } from "./locale-switcher";
import { NavLinks, type NavItem } from "./nav-links";
import { UserMenu } from "./user-menu";

export async function TopNav() {
  const t = await getTranslations("app");
  const user = await getSessionUser();
  if (!user) return null;

  const items: NavItem[] = [
    { href: "/biblioteca", label: t("nav.library") },
    { href: "/degustacion", label: t("nav.tasting") },
    { href: "/drafts", label: t("nav.drafts") },
    { href: "/academy", label: t("nav.academy") },
  ];

  if (canManageUsers(user.profile.role)) {
    items.push({ href: "/admin/usuarios", label: t("nav.users") });
  }

  return (
    <header className="bg-bosque text-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
        <Link href="/biblioteca" className="font-display text-xl font-semibold whitespace-nowrap">
          {t("name")}
        </Link>

        {/* En móvil el nav pasa a una fila propia con scroll horizontal. */}
        <NavLinks
          items={items}
          className="order-3 -mx-1 w-full overflow-x-auto pb-1 sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible sm:pb-0"
        />

        <div className="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          <UserMenu
            email={user.email}
            fullName={user.profile.full_name}
            role={user.profile.role}
          />
        </div>
      </div>
    </header>
  );
}
