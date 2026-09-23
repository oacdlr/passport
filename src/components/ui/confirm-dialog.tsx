"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Confirmación para acciones destructivas. Deliberadamente NO usa window.confirm:
 * bloquea el hilo y no se puede traducir ni estilizar.
 */
export function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bosque/40" />
        <Dialog.Content className="rounded-card fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 border border-borde bg-white p-6 shadow-lg">
          <Dialog.Title className="font-display text-xl text-bosque">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-tinta-suave">{body}</Dialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm">
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              variant="primary"
              size="sm"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onConfirm();
                } finally {
                  setPending(false);
                  setOpen(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
