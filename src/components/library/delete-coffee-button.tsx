"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCoffee } from "@/features/library/actions";

/** Sólo se renderiza para admin, y la policy "sólo admin borra cafés" lo
 *  vuelve a comprobar en la base. */
export function DeleteCoffeeButton({ id, name }: { id: string; name: string }) {
  const t = useTranslations("library.detail");
  const tCommon = useTranslations("common");

  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger" size="sm">
          {t("delete")}
        </Button>
      }
      title={t("deleteConfirmTitle")}
      body={t("deleteConfirmBody", { name })}
      confirmLabel={t("deleteConfirm")}
      cancelLabel={tCommon("cancel")}
      onConfirm={async () => {
        const formData = new FormData();
        formData.set("id", id);
        await deleteCoffee(formData);
      }}
    />
  );
}
