"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { signOut } from "@/features/auth/actions";
import { initials } from "@/lib/utils";
import type { AppRole } from "@/types/database";

export function UserMenu({
  email,
  fullName,
  role,
}: {
  email: string;
  fullName: string | null;
  role: AppRole;
}) {
  const t = useTranslations("app");
  const tAdmin = useTranslations("admin");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex size-9 items-center justify-center rounded-full bg-terracota text-xs font-semibold text-white"
        aria-label={fullName ?? email}
      >
        {initials(fullName, email)}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="rounded-card z-50 min-w-56 border border-borde bg-white p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-tinta">{fullName ?? email}</p>
            <p className="truncate text-xs text-tinta-suave">{email}</p>
            <p className="mt-1 text-xs text-tinta-suave">
              {t("userMenu.role")}: {tAdmin(`roles.${role}`)}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-borde" />
          <DropdownMenu.Item asChild>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-tinta hover:bg-crema"
              >
                {t("userMenu.signOut")}
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
