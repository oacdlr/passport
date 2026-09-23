"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { changeUserRole, type ActionState } from "@/features/auth/actions";
import { Select } from "@/components/ui/field";
import type { AppRole } from "@/types/database";

const ROLES: AppRole[] = ["viewer", "editor", "admin"];

/**
 * Cambia el rol al soltar el select. La acción corre con la sesión del admin,
 * así que el trigger prevent_role_escalation puede comprobar quién la pide.
 */
export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: AppRole;
  disabled?: boolean;
}) {
  const t = useTranslations("admin");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changeUserRole, {});

  useEffect(() => {
    if (state.error) formRef.current?.reset();
  }, [state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="userId" value={userId} />
      <Select
        name="role"
        defaultValue={role}
        disabled={disabled || pending}
        aria-label={t("roleLabel")}
        className="py-2 text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {ROLES.map((value) => (
          <option key={value} value={value}>
            {t(`roles.${value}`)}
          </option>
        ))}
      </Select>
      {state.error && (
        <p role="alert" className="text-xs text-terracota">
          {state.error}
        </p>
      )}
    </form>
  );
}
