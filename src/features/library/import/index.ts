/**
 * Superficie del import segura para el cliente.
 *
 * Aquí NO se re-exportan los lectores: `readers.ts` usa `read-excel-file/node`,
 * que depende de `fs`, y colarlo en el bundle del navegador rompe el build.
 * El wizard importa de aquí; el servidor importa de `./server`.
 */

export type { ImportError, ImportPreview, ImportRow, RawRow } from "./parser";
export { rowsToPreview, buildRow, normalizeHeader } from "./parser";
export { CSV_TEMPLATE, CSV_TEMPLATE_HEADERS } from "./template";

export const SPREADSHEET_ACCEPT =
  ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Extensiones que sabemos leer. El .xls antiguo (BIFF) no está soportado. */
export type SpreadsheetKind = "csv" | "xlsx";

export function kindFromFilename(filename: string): SpreadsheetKind | null {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "csv") return "csv";
  if (extension === "xlsx") return "xlsx";
  return null;
}
