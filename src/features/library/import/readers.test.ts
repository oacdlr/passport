import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { readXlsx } from "./readers";
import { rowsToPreview } from "./parser";

/**
 * Excel entra por un lector distinto al de CSV, pero desemboca en el mismo
 * `rowsToPreview`. Lo que se comprueba aquí es justamente eso: que un .xlsx y
 * un .csv con el mismo contenido produzcan el mismo resultado.
 *
 * Los fixtures se construyen a mano (un .xlsx es un zip de XML) para no meter
 * una dependencia de escritura de Excel sólo para los tests.
 */

const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const NS_CT = "http://schemas.openxmlformats.org/package/2006/content-types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 0 -> A, 25 -> Z, 26 -> AA */
function columnLetter(index: number): string {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

/** Construye un .xlsx mínimo y válido a partir de una matriz de celdas. */
function makeXlsx(rows: (string | number | null)[][]): Buffer {
  const sheetRows = rows
    .map((cells, rowIndex) => {
      const r = rowIndex + 1;
      const body = cells
        .map((cell, columnIndex) => {
          if (cell === null || cell === "") return "";
          const ref = `${columnLetter(columnIndex)}${r}`;
          return typeof cell === "number"
            ? `<c r="${ref}"><v>${cell}</v></c>`
            : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${body}</row>`;
    })
    .join("");

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS_CT}">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `</Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_PKG_REL}">` +
        `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
        `<sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_PKG_REL}">` +
        `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS_MAIN}">` +
        `<sheetData>${sheetRows}</sheetData></worksheet>`,
    ),
  };

  return Buffer.from(zipSync(files));
}

describe("lector de Excel", () => {
  it("lee un libro sencillo con encabezado y datos", async () => {
    const { rows, error } = await readXlsx(
      makeXlsx([
        ["nombre", "tipo", "paises", "cuerpo"],
        ["Finca La Esperanza", "single origin", "Colombia", 3],
      ]),
    );

    expect(error).toBeUndefined();
    // Las claves ya vienen normalizadas: nombre->name, tipo->kind, paises->countries.
    expect(rows).toEqual([
      { name: "Finca La Esperanza", kind: "single origin", countries: "Colombia", body: "3" },
    ]);
  });

  it("produce el mismo café que el CSV equivalente", async () => {
    const { rows } = await readXlsx(
      makeXlsx([
        ["nombre", "tipo", "paises", "regiones", "tueste", "cuerpo", "acidez"],
        ["Finca La Esperanza", "single origin", "Colombia", "Huila", "medio", 3, 5],
      ]),
    );

    const result = rowsToPreview(rows ?? []);
    expect(result.validCount).toBe(1);
    expect(result.rows[0].data).toMatchObject({
      name: "Finca La Esperanza",
      kind: "single_origin",
      roast: "medium",
      body: 3,
      acidity: 5,
    });
    expect(result.rows[0].data?.origins[0]).toMatchObject({
      country_code: "CO",
      region: "Huila",
    });
  });

  it("normaliza los encabezados igual que el CSV", async () => {
    const { rows } = await readXlsx(
      makeXlsx([
        ["  NOMBRE ", "Type", "Country"],
        ["Ethiopian Guji", "single origin", "Ethiopia"],
      ]),
    );

    expect(rows?.[0]).toEqual({
      name: "Ethiopian Guji",
      kind: "single origin",
      countries: "Ethiopia",
    });
  });

  it("convierte los números a texto para que el parser los valide igual", async () => {
    const { rows } = await readXlsx(
      makeXlsx([
        ["nombre", "tipo", "paises", "altitudes"],
        ["X", "single origin", "Colombia", 1750],
      ]),
    );

    expect(rows?.[0].altitudes).toBe("1750");
    expect(rowsToPreview(rows ?? []).rows[0].data?.origins[0].altitude_masl).toBe(1750);
  });

  it("salta las filas en blanco intercaladas", async () => {
    const { rows } = await readXlsx(
      makeXlsx([
        ["nombre", "tipo", "paises"],
        ["A", "mezcla", "Colombia"],
        [null, null, null],
        ["B", "mezcla", "Brasil"],
      ]),
    );

    expect(rows).toHaveLength(2);
    expect(rows?.map((r) => r.name)).toEqual(["A", "B"]);
  });

  it("avisa cuando sólo hay encabezado", async () => {
    const { error } = await readXlsx(makeXlsx([["nombre", "tipo", "paises"]]));
    expect(error).toEqual({ key: "empty" });
  });

  it("avisa cuando la hoja está vacía", async () => {
    const { error } = await readXlsx(makeXlsx([]));
    expect(error).toEqual({ key: "empty" });
  });

  it("no revienta con un archivo que no es un Excel", async () => {
    const { error } = await readXlsx(Buffer.from("esto no es un xlsx, es texto plano"));
    expect(error).toEqual({ key: "parse" });
  });

  it("aplica las reglas de negocio igual que en CSV", async () => {
    const { rows } = await readXlsx(
      makeXlsx([
        ["nombre", "tipo", "paises", "cuerpo"],
        ["Fuera de rango", "single origin", "Colombia", 9],
        ["Dos países", "single origin", "Colombia|Brasil", 3],
        ["Buena", "mezcla", "Colombia|Brasil", 3],
      ]),
    );

    const result = rowsToPreview(rows ?? []);
    expect(result.validCount).toBe(1);
    expect(result.rows[0].errors.map((e) => e.key)).toContain("invalidScale");
    expect(result.rows[1].errors.map((e) => e.key)).toContain("singleOriginOneCountry");
  });
});
