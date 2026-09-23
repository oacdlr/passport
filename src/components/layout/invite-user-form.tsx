"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { inviteUser, type ActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { AppRole } from "@/types/database";

const ROLES: AppRole[] = ["viewer", "editor", "admin"];

export function InviteUserForm() {
  const t = useTranslations("admin");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(inviteUser, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Field
        label={t("emailLabel")}
        htmlFor="invite-email"
        error={state.error}
        className="min-w-56 flex-1"
      >
        <Input id="invite-email" name="email" type="email" required autoComplete="off" />
      </Field>

      <Field label={t("roleLabel")} htmlFor="invite-role" className="min-w-40">
        <Select id="invite-role" name="role" defaultValue="viewer">
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`roles.${role}`)}
            </option>
          ))}
        </Select>
      </Field>

      <Button type="submit" disabled={pending}>
        {t("invite")}
      </Button>

      {state.ok && (
        <p role="status" className="basis-full text-sm text-bosque">
          {t("inviteSent")}
        </p>
      )}
    </form>
  );
}
