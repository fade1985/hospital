#!/usr/bin/env python3
"""Descarga la geometria del recinto del Hospital Universitario Ramon y Cajal
desde OpenStreetMap (Overpass API) y la guarda como GeoJSON proyectado.

El GeoJSON resultante (`data/recinto.geojson`) conserva las coordenadas
WGS84 originales y anade a cada feature una propiedad `xy` con la geometria
proyectada a metros (ENU local con origen en el centroide del recinto), que es
lo que consume directamente el visor SVG de `web/`.

Uso:
    python3 scripts/fetch_recinto.py                 # descarga y regenera
    python3 scripts/fetch_recinto.py --raw out.json  # guarda tambien el JSON crudo

Datos (c) colaboradores de OpenStreetMap, licencia ODbL 1.0.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "data" / "recinto.geojson"

# Recinto hospitalario: sur/oeste/norte/este. Cubre el edificio principal,
# urgencias, resonancia, consultas externas y el pabellon docente.
BBOX = (40.4853, -3.6980, 40.4895, -3.6900)

ESPEJOS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
)

CONSULTA = """
[out:json][timeout:120];
(
  way["building"]({bbox});
  relation["building"]({bbox});
  way["amenity"="hospital"]({bbox});
  way["amenity"="parking"]({bbox});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|footway|pedestrian)$"]({bbox});
  way["railway"="rail"]({bbox});
  node["railway"="station"]({bbox});
  node["highway"="bus_stop"]({bbox});
);
out geom;
"""

# Elementos OSM del recinto que el visor destaca. Cada clave es "tipo/id" de OSM.
#
# Solo se identifica lo que OpenStreetMap nombra explicitamente. Urgencias y
# Resonancia Magnetica no estan cartografiadas como edificios propios: quedan
# dentro de la huella unica del edificio principal, asi que no se rotulan aqui.
# Su posicion documentada figura en `edificios_anexos` de data/hospital.json.
ANOTACIONES = {
    "relation/13037178": {
        "id": "edificio-principal",
        "nombre": "Edificio Principal",
        "categoria": "principal",
        "plantas": 18,
        "rotular": True,
    },
    "way/968812172": {
        "id": "pabellon-docente",
        "nombre": "Pabellón Docente / Consultas Externas",
        "categoria": "docente",
        "rotular": True,
    },
    "way/14665984": {
        "id": "apeadero",
        "nombre": "Apeadero de Cercanías Ramón y Cajal",
        "categoria": "transporte",
        "rotular": True,
    },
    "way/712717531": {
        "id": "apeadero-acceso-3",
        "nombre": "Apeadero, acceso 3",
        "categoria": "transporte",
        "rotular": False,
    },
    "way/394889264": {
        "id": "anexo-este-1",
        "nombre": "Edificio anexo al este (sin nombre en OpenStreetMap)",
        "categoria": "anexo",
        "rotular": False,
    },
    "way/394889265": {
        "id": "anexo-este-2",
        "nombre": "Edificio anexo al este (sin nombre en OpenStreetMap)",
        "categoria": "anexo",
        "rotular": False,
    },
    "way/394889262": {
        "id": "recinto",
        "nombre": "Recinto hospitalario",
        "categoria": "recinto",
        "rotular": False,
    },
}


def descargar(bbox: tuple[float, float, float, float]) -> dict:
    cuerpo = CONSULTA.format(bbox=",".join(str(v) for v in bbox)).encode("utf-8")
    ultimo_error: Exception | None = None
    for intento, espejo in enumerate([*ESPEJOS, *ESPEJOS]):
        try:
            peticion = urllib.request.Request(
                espejo,
                data=cuerpo,
                headers={"User-Agent": "mapa-ryc/1.0 (+https://github.com)"},
            )
            with urllib.request.urlopen(peticion, timeout=180) as respuesta:
                return json.loads(respuesta.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as exc:
            ultimo_error = exc
            espera = 2 ** intento
            print(f"  aviso: {espejo} fallo ({exc}); reintento en {espera}s", file=sys.stderr)
            time.sleep(espera)
    raise SystemExit(f"No se pudo consultar Overpass: {ultimo_error}")


def anillo(geometria: list[dict]) -> list[list[float]]:
    puntos = [[round(p["lon"], 7), round(p["lat"], 7)] for p in geometria]
    if puntos and puntos[0] != puntos[-1]:
        puntos.append(puntos[0])
    return puntos


def proyectar(coordenadas, lat0: float, lon0: float):
    """Proyecta lon/lat a metros (ENU plano) con origen en (lat0, lon0)."""
    k = math.cos(math.radians(lat0))
    metros_por_grado = 111320.0

    def punto(p):
        x = (p[0] - lon0) * metros_por_grado * k
        y = (p[1] - lat0) * metros_por_grado
        # El SVG crece hacia abajo, asi que invertimos el eje norte-sur.
        return [round(x, 2), round(-y, 2)]

    if not coordenadas:
        return []
    if isinstance(coordenadas[0], (int, float)):  # Point
        return punto(coordenadas)
    if isinstance(coordenadas[0][0], (int, float)):  # LineString / anillo
        return [punto(p) for p in coordenadas]
    return [proyectar(sub, lat0, lon0) for sub in coordenadas]


def a_feature(elemento: dict) -> dict | None:
    etiquetas = elemento.get("tags", {}) or {}
    clave = f"{elemento['type']}/{elemento['id']}"

    if elemento["type"] == "node":
        if "lat" not in elemento:
            return None
        geometria = {"type": "Point", "coordinates": [round(elemento["lon"], 7), round(elemento["lat"], 7)]}
    elif elemento["type"] == "way":
        puntos = elemento.get("geometry") or []
        if len(puntos) < 2:
            return None
        cerrado = puntos[0]["lat"] == puntos[-1]["lat"] and puntos[0]["lon"] == puntos[-1]["lon"]
        es_area = cerrado and (
            etiquetas.get("building")
            or etiquetas.get("amenity") in {"hospital", "parking"}
            or etiquetas.get("area") == "yes"
        )
        if es_area:
            geometria = {"type": "Polygon", "coordinates": [anillo(puntos)]}
        else:
            geometria = {
                "type": "LineString",
                "coordinates": [[round(p["lon"], 7), round(p["lat"], 7)] for p in puntos],
            }
    else:  # relation multipolygon
        exteriores, interiores = [], []
        for miembro in elemento.get("members", []):
            puntos = miembro.get("geometry") or []
            if len(puntos) < 3:
                continue
            (exteriores if miembro.get("role") != "inner" else interiores).append(anillo(puntos))
        if not exteriores:
            return None
        # Overpass devuelve los anillos de un multipolygon troceados en ways;
        # los tratamos como poligonos independientes con los huecos comunes.
        poligonos = [[ext, *interiores] for ext in exteriores]
        geometria = {"type": "MultiPolygon", "coordinates": poligonos}

    propiedades = {"osm": clave, **etiquetas}
    propiedades.update(ANOTACIONES.get(clave, {}))
    return {"type": "Feature", "properties": propiedades, "geometry": geometria}


def relevante(feature: dict) -> bool:
    p = feature["properties"]
    if p.get("id"):
        return True
    # Fuera del recinto solo conservamos viales y transporte como contexto.
    return bool(
        p.get("highway")
        or p.get("railway")
        or p.get("amenity") == "parking"
        or p.get("building")
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", help="ruta donde volcar la respuesta cruda de Overpass")
    parser.add_argument("--salida", default=str(SALIDA), help="ruta del GeoJSON de salida")
    args = parser.parse_args()

    print("Consultando Overpass API...")
    crudo = descargar(BBOX)
    if args.raw:
        Path(args.raw).write_text(json.dumps(crudo), encoding="utf-8")

    features = [f for f in (a_feature(e) for e in crudo["elements"]) if f and relevante(f)]

    lat0 = (BBOX[0] + BBOX[2]) / 2
    lon0 = (BBOX[1] + BBOX[3]) / 2
    for feature in features:
        feature["properties"]["xy"] = proyectar(feature["geometry"]["coordinates"], lat0, lon0)

    coleccion = {
        "type": "FeatureCollection",
        "metadatos": {
            "fuente": "OpenStreetMap via Overpass API",
            "licencia": "ODbL 1.0 - (c) colaboradores de OpenStreetMap",
            "descargado": crudo.get("osm3s", {}).get("timestamp_osm_base"),
            "bbox": list(BBOX),
            "origen_proyeccion": {"lat": lat0, "lon": lon0},
            "generado_por": "scripts/fetch_recinto.py",
        },
        "features": features,
    }

    destino = Path(args.salida)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(coleccion, ensure_ascii=False, indent=1), encoding="utf-8")

    etiquetados = sum(1 for f in features if f["properties"].get("id"))
    print(f"{len(features)} features escritas en {destino} ({etiquetados} identificadas)")


if __name__ == "__main__":
    main()
