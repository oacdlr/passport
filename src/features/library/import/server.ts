import "server-only";

import { rowsToPreview, type ImportError, type ImportPreview } from "./parser";
import { kindFromFilename } from "./index";
import { readCsv, readXlsx } from "./readers";

/**
 * Punto de entrada del import en el servidor. Quien llama no necesita saber si
 * el archivo es CSV o Excel.
 *
 * Vive aparte de `index.ts` porque arrastra `read-excel-file/node`, que depende
 * de `fs`. El `server-only` de arriba convierte un import desde el cliente en
 * un error claro en vez de un "Can't resolve 'fs'".
 */
export async function parseSpreadsheet(
  filename: string,
  bytes: ArrayBuffer,
): Promise<{ preview?: ImportPreview; error?: ImportError }> {
  const kind = kindFromFilename(filename);
  if (!kind) return { error: { key: "unsupportedFormat" } };

  const read =
    kind === "csv"
      ? readCsv(new TextDecoder("utf-8").decode(bytes))
      : await readXlsx(Buffer.from(bytes));

  if (read.error) return { error: read.error };
  return { preview: rowsToPreview(read.rows ?? []) };
}
