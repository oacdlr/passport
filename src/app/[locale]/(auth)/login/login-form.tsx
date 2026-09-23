"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInWithMagicLink, type ActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    signInWithMagicLink,
    {},
  );

  const error = state.error ?? (linkError ? t("errors.link") : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      <Field label={t("emailLabel")} htmlFor="email" error={error}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder={t("emailPlaceholder")}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>

      <p className="text-center text-xs text-tinta-suave">{t("closedTeam")}</p>
    </form>
  );
}
