import { describe, expect, it } from "vitest";
import { readCsv } from "./readers";
import { rowsToPreview } from "./parser";
import { CSV_TEMPLATE } from "./template";

/**
 * El import es la única puerta por la que entran datos en bloque a la
 * Biblioteca, así que su comportamiento se fija aquí: qué se acepta, qué se
 * rechaza y con qué motivo.
 */

/** Atajo: de texto CSV al preview que ve el wizard. */
function preview(csv: string) {
  const { rows, error } = readCsv(csv);
  if (error) throw new Error(`lectura fallida: ${error.key}`);
  return rowsToPreview(rows ?? []);
}

/** Motivos de error de una fila, sin el detalle de los valores. */
function reasons(csv: string, index = 0) {
  return preview(csv).rows[index].errors.map((e) => e.key);
}

describe("plantilla descargable", () => {
  it("se importa sin tocar nada", () => {
    const result = preview(CSV_TEMPLATE);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(0);
  });

  it("interpreta el single origin y la mezcla del ejemplo", () => {
    const [single, blend] = preview(CSV_TEMPLATE).rows;

    expect(single.data).toMatchObject({
      name: "Finca La Esperanza",
      kind: "single_origin",
      roast: "medium",
      process: "washed",
      body: 3,
      acidity: 5,
    });
    expect(single.data?.origins).toEqual([
      expect.objectContaining({ country_code: "CO", region: "Huila", altitude_masl: 1750 }),
    ]);

    expect(blend.data?.kind).toBe("blend");
    expect(blend.data?.origins.map((o) => o.country_code)).toEqual(["BR", "GT"]);
  });
});

describe("reglas de negocio", () => {
  it("rechaza cuerpo o acidez fuera de 1–5", () => {
    expect(reasons("nombre,tipo,paises,cuerpo\nX,single origin,Colombia,9")).toContain(
      "invalidScale",
    );
    expect(reasons("nombre,tipo,paises,acidez\nX,single origin,Colombia,0")).toContain(
      "invalidScale",
    );
  });

  it("acepta los extremos de la escala", () => {
    const result = preview("nombre,tipo,paises,cuerpo,acidez\nX,single origin,Colombia,1,5");
    expect(result.validCount).toBe(1);
    expect(result.rows[0].data).toMatchObject({ body: 1, acidity: 5 });
  });

  it("exige nombre", () => {
    expect(reasons("nombre,tipo,paises\n,single origin,Colombia")).toContain("required");
  });

  it("exige al menos un país", () => {
    expect(reasons("nombre,tipo,paises\nX,single origin,")).toContain("noCountry");
  });

  it("no deja que un single origin traiga dos países", () => {
    expect(reasons("nombre,tipo,paises\nX,single origin,Colombia|Brasil")).toContain(
      "singleOriginOneCountry",
    );
  });

  it("sí deja que una mezcla traiga varios", () => {
    expect(preview("nombre,tipo,paises\nX,mezcla,Colombia|Brasil").validCount).toBe(1);
  });

  it("marca el tipo, el tueste y el proceso desconocidos", () => {
    expect(reasons("nombre,tipo,paises\nX,liquido,Colombia")).toContain("invalidKind");
    expect(reasons("nombre,tipo,paises,tueste\nX,mezcla,Colombia,violeta")).toContain(
      "invalidRoast",
    );
    expect(reasons("nombre,tipo,paises,proceso\nX,mezcla,Colombia,teletransportado")).toContain(
      "invalidProcess",
    );
  });

  it("deja tueste y proceso vacíos como null, sin error", () => {
    const result = preview("nombre,tipo,paises,tueste,proceso\nX,mezcla,Colombia,,");
    expect(result.validCount).toBe(1);
    expect(result.rows[0].data).toMatchObject({ roast: null, process: null });
  });
});

describe("países", () => {
  it("entiende el nombre en español, en inglés y el código ISO", () => {
    for (const value of ["Etiopía", "Ethiopia", "ET", "etiopia"]) {
      const result = preview(`nombre,tipo,paises\nX,single origin,${value}`);
      expect(result.rows[0].data?.origins[0].country_code, value).toBe("ET");
    }
  });

  it("rechaza un país inventado y dice cuál", () => {
    const row = preview("nombre,tipo,paises\nX,single origin,Wakanda").rows[0];
    expect(row.errors).toContainEqual({ key: "unknownCountry", values: { value: "Wakanda" } });
  });

  it("alinea regiones y productores con los países por posición", () => {
    const row = preview(
      "nombre,tipo,paises,regiones,productores\nX,mezcla,Colombia|Brasil,Huila|Cerrado,Ana|Bruno",
    ).rows[0];

    expect(row.data?.origins).toEqual([
      expect.objectContaining({ country_code: "CO", region: "Huila", producer: "Ana" }),
      expect.objectContaining({ country_code: "BR", region: "Cerrado", producer: "Bruno" }),
    ]);
  });
});

describe("encabezados", () => {
  it("acepta los nombres en inglés", () => {
    const row = preview(
      "name,type,country,region,roast,body\nEthiopian Guji,single origin,Ethiopia,Guji,light,2",
    ).rows[0];

    expect(row.data).toMatchObject({ name: "Ethiopian Guji", roast: "light", body: 2 });
  });

  it("ignora mayúsculas y espacios alrededor", () => {
    const result = preview("  NOMBRE , Tipo , PAISES \nX,single origin,Colombia");
    expect(result.validCount).toBe(1);
  });

  it("guarda en extra las columnas que no reconoce, en vez de perderlas", () => {
    const row = preview(
      "nombre,tipo,paises,variedad,tostador\nX,single origin,Colombia,Caturra,Tal",
    ).rows[0];

    expect(row.data?.extra).toEqual({ variedad: "Caturra", tostador: "Tal" });
  });
});

describe("campo extra", () => {
  it("entiende el formato clave: valor; otra: cosa", () => {
    const row = preview(
      'nombre,tipo,paises,extra\nX,single origin,Colombia,"variedad: Caturra; lote: 2026-04"',
    ).rows[0];

    expect(row.data?.extra).toEqual({ variedad: "Caturra", lote: "2026-04" });
  });

  it("entiende JSON", () => {
    const row = preview(
      'nombre,tipo,paises,extra\nX,single origin,Colombia,"{""variedad"":""Geisha"",""puntaje"":90}"',
    ).rows[0];

    expect(row.data?.extra).toEqual({ variedad: "Geisha", puntaje: "90" });
  });
});

describe("listas", () => {
  it("separa notas y sabores por barra o punto y coma", () => {
    const row = preview(
      'nombre,tipo,paises,notas_cata,sabores_complementarios\nX,single origin,Colombia,"cítrico|jazmín","chocolate;pan"',
    ).rows[0];

    expect(row.data?.tasting_notes).toEqual(["cítrico", "jazmín"]);
    expect(row.data?.complementary_flavors).toEqual(["chocolate", "pan"]);
  });
});

describe("duplicados y numeración", () => {
  it("detecta el mismo café repetido aunque cambie la caja", () => {
    const result = preview("nombre,tipo,paises\nCerro Azul,single origin,Peru\ncerro azul,single origin,Peru");

    expect(result.validCount).toBe(1);
    expect(result.rows[1].errors.map((e) => e.key)).toContain("duplicateInFile");
  });

  it("numera las filas como la hoja de cálculo, empezando en 2", () => {
    const result = preview("nombre,tipo,paises\nA,mezcla,Colombia\nB,mezcla,Brasil");
    expect(result.rows.map((r) => r.row)).toEqual([2, 3]);
  });

  it("una fila rota no bloquea a las demás", () => {
    const result = preview(
      "nombre,tipo,paises\nBuena,mezcla,Colombia\n,mezcla,Colombia\nOtra buena,mezcla,Brasil",
    );

    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(1);
  });

  it("no repite el mismo motivo de error dos veces en una fila", () => {
    const errors = reasons("nombre,tipo,paises\nX,mezcla,Wakanda|Wakanda");
    expect(errors.filter((key) => key === "unknownCountry")).toHaveLength(1);
  });
});

describe("archivos vacíos", () => {
  it("avisa cuando sólo hay encabezado", () => {
    expect(readCsv("nombre,tipo,paises").error).toEqual({ key: "empty" });
  });

  it("avisa cuando el archivo está vacío", () => {
    expect(readCsv("").error).toBeDefined();
  });
});
