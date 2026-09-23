import Papa from "papaparse";

/** Plantilla descargable, en CSV: sirve de contrato del formato para el equipo. */
export const CSV_TEMPLATE_HEADERS = [
  "nombre",
  "tipo",
  "paises",
  "regiones",
  "productores",
  "fincas",
  "altitudes",
  "tueste",
  "proceso",
  "cuerpo",
  "acidez",
  "historia",
  "notas_cata",
  "sabores_complementarios",
  "extra",
];

/** Plantilla descargable: dos filas de ejemplo, una single origin y una mezcla. */
export const CSV_TEMPLATE = Papa.unparse({
  fields: CSV_TEMPLATE_HEADERS,
  data: [
    [
      "Finca La Esperanza",
      "single origin",
      "Colombia",
      "Huila",
      "Familia Restrepo",
      "El Mirador",
      "1750",
      "medio",
      "lavado",
      "3",
      "5",
      "Cultivado a 1.750 msnm en Huila.",
      "cítrico|jazmín|chocolate",
      "chocolate 70%|queso de cabra",
      "variedad: Caturra; lote: 2026-04",
    ],
    [
      "Casa Blend No. 4",
      "mezcla",
      "Brasil|Guatemala",
      "Cerrado|Antigua",
      "",
      "",
      "",
      "medio-oscuro",
      "natural",
      "4",
      "2",
      "Mezcla de casa para espresso.",
      "nuez|caramelo",
      "leche entera",
      "uso: espresso",
    ],
  ],
});
