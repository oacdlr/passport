import "server-only";

import Papa from "papaparse";
import { readSheet } from "read-excel-file/node";
import { normalizeHeader, type ImportError, type RawRow } from "./parser";

/**
 * Lectores de archivo: CSV y Excel entran por aquí y salen como `RawRow[]`.
 * A partir de ese punto los dos formatos comparten camino (ver `parser.ts`).
 *
 * Se usa `read-excel-file` y no SheetJS porque la versión de `xlsx` publicada
 * en npm está congelada en 0.18.5, con prototype pollution y ReDoS sin parchear
 * (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9). Aquí se parsean archivos que sube
 * un usuario, así que no es un riesgo aceptable.
 */

export type ReadResult = { rows?: RawRow[]; error?: ImportError };

export function readCsv(text: string): ReadResult {
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  if (result.data.length === 0) {
    return { error: { key: result.errors.length > 0 ? "parse" : "empty" } };
  }

  return { rows: result.data };
}

/** Las celdas de Excel llegan tipadas; el parser trabaja con texto. */
function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

export async function readXlsx(buffer: Buffer): Promise<ReadResult> {
  // Se lee la primera hoja del libro, que es donde el equipo va a poner los datos.
  let sheet: unknown[][];
  try {
    sheet = (await readSheet(buffer)) as unknown[][];
  } catch {
    return { error: { key: "parse" } };
  }

  // La primera fila no vacía manda: es el encabezado.
  const firstContentIndex = sheet.findIndex((row) =>
    row.some((cell) => cellToText(cell) !== ""),
  );
  if (firstContentIndex === -1) return { error: { key: "empty" } };

  const headers = sheet[firstContentIndex].map((cell) => normalizeHeader(cellToText(cell)));

  const rows: RawRow[] = [];
  for (const line of sheet.slice(firstContentIndex + 1)) {
    if (!line.some((cell) => cellToText(cell) !== "")) continue; // fila en blanco

    const row: RawRow = {};
    headers.forEach((header, index) => {
      if (header) row[header] = cellToText(line[index]);
    });
    rows.push(row);
  }

  if (rows.length === 0) return { error: { key: "empty" } };
  return { rows };
}
