#!/usr/bin/env node
/**
 * Empaqueta los datos de `data/` en `web/datos.js` para que el visor funcione
 * tambien abriendo `web/index.html` directamente con doble clic (sin servidor,
 * donde `fetch()` sobre file:// esta bloqueado).
 *
 * Uso: node scripts/build_web_data.mjs [--check]
 *   --check  no escribe nada; falla si `web/datos.js` esta desactualizado.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destino = resolve(raiz, "web/datos.js");
const soloComprobar = process.argv.includes("--check");

const leer = (ruta) => JSON.parse(readFileSync(resolve(raiz, ruta), "utf8"));

const hospital = leer("data/hospital.json");
const directorio = leer("data/directorio.json");
const recinto = leer("data/recinto.geojson");

/** Aplana el directorio anidado a una lista indexable y buscable. */
function aplanar(directorio) {
  const filas = [];
  for (const [zona, plantas] of Object.entries(directorio.zonas)) {
    for (const [planta, entradas] of Object.entries(plantas)) {
      for (const [bloque, servicio, habitaciones = null] of entradas) {
        filas.push({ zona, planta, bloque, servicio, habitaciones });
      }
    }
  }
  return filas;
}

const ubicaciones = aplanar(directorio);

const ordenPlantas = new Map(hospital.plantas.map((p, i) => [p.id, i]));
const zonasValidas = new Set(hospital.zonas.map((z) => z.id));
const bloquesValidos = new Set(hospital.bloques.map((b) => b.id));

const errores = [];
for (const u of ubicaciones) {
  if (!ordenPlantas.has(u.planta)) errores.push(`planta desconocida: ${u.planta}`);
  if (!zonasValidas.has(u.zona)) errores.push(`zona desconocida: ${u.zona}`);
  if (!bloquesValidos.has(u.bloque)) errores.push(`bloque desconocido: ${u.bloque}`);
  if (!u.servicio && !u.habitaciones) {
    errores.push(`entrada sin servicio ni habitaciones en ${u.zona}/${u.planta}`);
  }
}
if (errores.length) {
  console.error("Datos invalidos:");
  for (const e of [...new Set(errores)]) console.error("  - " + e);
  process.exit(1);
}

ubicaciones.sort(
  (a, b) =>
    ordenPlantas.get(a.planta) - ordenPlantas.get(b.planta) ||
    a.zona.localeCompare(b.zona) ||
    a.bloque.localeCompare(b.bloque) ||
    (a.servicio ?? "").localeCompare(b.servicio ?? "", "es"),
);

// El visor dibuja en el plano proyectado (`xy`), asi que el paquete web se
// queda solo con eso y con las etiquetas que necesita para pintar y rotular.
const ETIQUETAS_UTILES = new Set([
  "osm",
  "id",
  "nombre",
  "categoria",
  "plantas",
  "rotular",
  "building",
  "amenity",
  "highway",
  "railway",
  "name",
]);

const recintoWeb = {
  metadatos: recinto.metadatos,
  features: recinto.features.map((f) => {
    const props = { tipoGeom: f.geometry.type, xy: f.properties.xy };
    for (const [k, v] of Object.entries(f.properties)) {
      if (ETIQUETAS_UTILES.has(k)) props[k] = v;
    }
    return props;
  }),
};

const paquete = {
  hospital,
  ubicaciones,
  notasDirectorio: directorio.meta,
  recinto: recintoWeb,
};

const contenido = `// Generado por scripts/build_web_data.mjs. No editar a mano.
// Fuente: data/hospital.json, data/directorio.json, data/recinto.geojson
window.DATOS = ${JSON.stringify(paquete)};
`;

if (soloComprobar) {
  let actual = "";
  try {
    actual = readFileSync(destino, "utf8");
  } catch {
    /* no existe */
  }
  if (actual !== contenido) {
    console.error("web/datos.js esta desactualizado. Ejecuta: node scripts/build_web_data.mjs");
    process.exit(1);
  }
  console.log(`web/datos.js al dia (${ubicaciones.length} ubicaciones)`);
} else {
  writeFileSync(destino, contenido, "utf8");
  const servicios = new Set(ubicaciones.filter((u) => u.servicio).map((u) => u.servicio));
  console.log(
    `web/datos.js escrito: ${ubicaciones.length} ubicaciones, ` +
      `${servicios.size} servicios distintos, ${recintoWeb.features.length} features de recinto`,
  );
}
