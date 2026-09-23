"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { analyzeSpreadsheet, importSpreadsheet } from "@/features/library/import-actions";
import {
  CSV_TEMPLATE,
  CSV_TEMPLATE_HEADERS,
  SPREADSHEET_ACCEPT,
  kindFromFilename,
  type ImportError,
  type ImportPreview,
} from "@/features/library/import";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;

export function ImportWizard() {
  const t = useTranslations("library.import");
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<ImportError | null>(null);
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [result, setResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function describe(importError: ImportError): string {
    // Las claves vienen del parser, que no sabe de idiomas.
    return t(`errors.${importError.key}` as never, importError.values as never);
  }

  function handleFile(picked: File) {
    setError(null);
    setPreview(null);
    setResult(null);
    setFile(picked);

    if (!kindFromFilename(picked.name)) {
      setError({ key: "unsupportedFormat" });
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError({ key: "tooLarge" });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", picked);
      const analysis = await analyzeSpreadsheet(formData);
      if (analysis.error) setError(analysis.error);
      else setPreview(analysis.preview ?? null);
    });
  }

  function handleImport() {
    if (!file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("mode", mode);
      const outcome = await importSpreadsheet(formData);
      if (outcome.error) setError(outcome.error);
      else {
        setResult(outcome.result ?? null);
        router.refresh();
      }
    });
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    setResult(null);
  }

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`;

  if (result) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-4">
          <p className="text-sm text-tinta">{t("result", result)}</p>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/biblioteca")}>{t("goToLibrary")}</Button>
            <Button variant="secondary" onClick={reset}>
              {t("startOver")}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-bosque">{t("step1")}</h2>

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer">
              <span className="inline-flex h-11 items-center rounded-xl border border-borde bg-white px-5 text-sm font-medium">
                {t("chooseFile")}
              </span>
              <input
                type="file"
                accept={SPREADSHEET_ACCEPT}
                className="sr-only"
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  if (picked) handleFile(picked);
                }}
              />
            </label>

            <a
              href={templateHref}
              download="plantilla-biblioteca.csv"
              className="text-sm text-bosque underline underline-offset-4"
            >
              {t("downloadTemplate")}
            </a>
          </div>

          {file && !error && (
            <p className="text-sm text-tinta-suave">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}

          <details className="text-sm text-tinta-suave">
            <summary className="cursor-pointer">{t("columnsTitle")}</summary>
            <p className="mt-2 font-mono text-xs break-words">{CSV_TEMPLATE_HEADERS.join(", ")}</p>
          </details>

          {error && (
            <p role="alert" className="text-sm font-medium text-terracota">
              {describe(error)}
            </p>
          )}
        </CardBody>
      </Card>

      {preview && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <h2 className="font-display text-xl text-bosque">{t("step2")}</h2>

            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-medium text-bosque">
                {t("validRows", { count: preview.validCount })}
              </span>
              {preview.invalidCount > 0 && (
                <span className="font-medium text-terracota">
                  {t("invalidRows", { count: preview.invalidCount })}
                </span>
              )}
            </div>

            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {preview.rows.map((row) => (
                <li
                  key={row.row}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm",
                    row.data ? "border-borde bg-white" : "border-terracota/40 bg-terracota/5",
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-tinta">
                      {row.name || t("errors.required", { field: "nombre" })}
                    </span>
                    <span className="text-xs text-tinta-suave">
                      {t("rowLabel", { row: row.row })}
                    </span>
                  </div>
                  {row.errors.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {row.errors.map((rowError, index) => (
                        <li key={index} className="text-xs text-terracota">
                          {describe(rowError)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-tinta">{t("duplicates")}</legend>
              {(["skip", "update"] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm text-tinta-suave">
                  <input
                    type="radio"
                    name="mode"
                    value={option}
                    checked={mode === option}
                    onChange={() => setMode(option)}
                  />
                  {option === "skip" ? t("duplicatesSkip") : t("duplicatesUpdate")}
                </label>
              ))}
            </fieldset>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleImport} disabled={pending || preview.validCount === 0} size="lg">
                {pending ? t("importing") : t("confirm", { count: preview.validCount })}
              </Button>
              <Button variant="secondary" size="lg" onClick={reset} disabled={pending}>
                {t("startOver")}
              </Button>
            </div>

            {preview.validCount === 0 && <p className="text-sm text-terracota">{t("noValidRows")}</p>}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
