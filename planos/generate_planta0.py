#!/usr/bin/env python3
"""Professional wayfinding plan of Hospital Ramón y Cajal, Planta 0.

Schematic (not to scale) redrawn from the three-sheet field sketch:
izquierda / centro / derecha, with the main facade at the south.
"""

from __future__ import annotations

import html
import textwrap
from dataclasses import dataclass
from pathlib import Path

OUT = Path(__file__).resolve().parent
W, H = 3800, 1760

INK = "#1B2430"
MUTED = "#5B6B7A"
PAGE = "#EEF2F6"
WHITE = "#FFFFFF"
CORRIDOR = "#E4E9EF"
WALL = "#B7C2CE"

Z_IZQ, Z_IZQ_INK = "#D9EFE0", "#1B7A46"
Z_CEN, Z_CEN_INK = "#F8EDC4", "#A67C00"
Z_DER, Z_DER_INK = "#D7E8F8", "#1A5FA8"

CAT = {
    "cardio": ("#F8DDD9", "#C0392B"),
    "radio": ("#E6DCF3", "#6C3483"),
    "pedia": ("#D4F0EC", "#0E7A6B"),
    "nuclear": ("#DDE1F4", "#3F51B5"),
    "consulta": ("#D6E9FA", "#1565C0"),
    "servicio": ("#F8E1C4", "#D35400"),
    "aseo": ("#D3EEF2", "#0E7C86"),
    "stair": ("#E3E8EE", "#52606D"),
}

ELEV = {
    "izq": "#1B7A46",
    "marron": "#6D4C41",
    "centro": "#C99400",
    "rojo": "#C0392B",
    "verde": "#1B7A46",
    "derecha": "#1A5FA8",
    "grandes": "#4A6572",
}


@dataclass
class Box:
    x: float
    y: float
    w: float
    h: float
    title: str
    kind: str = "servicio"
    sub: str = ""


def esc(s: str) -> str:
    return html.escape(s)


def wrap(text: str, width: int) -> list[str]:
    return textwrap.wrap(text, width=width, break_long_words=False) or [text]


def text(cx, cy, lines, size, weight, fill, gap=None) -> str:
    gap = gap or int(size * 1.2)
    start = cy - ((len(lines) - 1) * gap) / 2
    tspans = []
    for i, line in enumerate(lines):
        dy = 0 if i == 0 else gap
        y_attr = f' y="{start:.1f}"' if i == 0 else ""
        tspans.append(f'<tspan x="{cx:.1f}"{y_attr} dy="{dy}">{esc(line)}</tspan>')
    return (
        f'<text x="{cx:.1f}" y="{start:.1f}" text-anchor="middle" '
        f'font-family="Inter, Liberation Sans, Arial, sans-serif" font-size="{size}" '
        f'font-weight="{weight}" fill="{fill}">{"".join(tspans)}</text>'
    )


def rect(x, y, w, h, r, fill, stroke="none", sw=1, extra="") -> str:
    return (
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" ry="{r}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
    )


def room(b: Box) -> str:
    fill, accent = CAT[b.kind]
    bits = [rect(b.x, b.y, b.w, b.h, 9, fill, "#C9D3DC", 1)]
    bits.append(f'<rect x="{b.x:.1f}" y="{b.y:.1f}" width="8" height="{b.h:.1f}" rx="4" fill="{accent}"/>')
    cx = b.x + b.w / 2 + 3
    cols = max(8, int(b.w / 8.4))
    size = 14 if b.w >= 170 and b.h >= 78 else 12
    if b.w < 130:
        size = 11
    lines = wrap(b.title, cols)
    if b.sub:
        bits.append(text(cx, b.y + b.h * 0.40, lines, size, "700", INK))
        bits.append(text(cx, b.y + b.h * 0.72, wrap(b.sub, cols + 2), 11, "500", MUTED, 14))
    else:
        bits.append(text(cx, b.y + b.h / 2, lines, size, "700", INK))
    return "".join(bits)


def elev_icon(cx, cy, color="#fff") -> str:
    return "".join(rect(cx + dx - 7, cy - 16, 14, 32, 2.5, color) for dx in (-18, 0, 18))


def elevator(x, y, w, h, color, lines: list[str]) -> str:
    return (
        rect(x, y, w, h, 12, color)
        + elev_icon(x + w / 2, y + 40)
        + text(x + w / 2, y + h * 0.70, lines, 13, "700", WHITE, 16)
    )


def door(x, y, w, h, label: str, primary=False) -> str:
    fill = "#15202B" if primary else "#2C3E50"
    cx, cy = x + w / 2, y + 32
    return (
        rect(x, y, w, h, 12, fill)
        + f'<polygon points="{cx-18},{cy} {cx},{cy-16} {cx+18},{cy}" fill="#F4D03F"/>'
        + f'<rect x="{cx-6:.1f}" y="{cy:.1f}" width="12" height="18" fill="#F4D03F"/>'
        + text(x + w / 2, y + h * 0.74, wrap(label, 12), 14, "700", WHITE, 17)
    )


def pill(x, y, w, label, color) -> str:
    return rect(x, y, w, 38, 9, color) + text(x + w / 2, y + 21, [label], 15, "700", WHITE)


def corridor(x, y, w, h) -> str:
    return rect(x, y, w, h, 8, CORRIDOR)


def build() -> str:
    out: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
        f'<rect width="{W}" height="{H}" fill="{PAGE}"/>',
        text(1900, 42, ["Hospital Universitario Ramón y Cajal"], 34, "700", INK),
        text(
            1900,
            78,
            ["Planta 0  ·  Plano de orientación  ·  Redibujo profesional del croquis de campo (no a escala)"],
            16,
            "500",
            MUTED,
        ),
        # building
        rect(86, 126, 3648, 1428, 24, "#D5DEE7"),
        rect(78, 118, 3648, 1428, 24, WHITE, WALL, 2),
        f'<rect x="80" y="158" width="1188" height="1346" fill="{Z_IZQ}"/>',
        f'<rect x="1268" y="158" width="1264" height="1346" fill="{Z_CEN}"/>',
        f'<rect x="2532" y="158" width="1190" height="1346" fill="{Z_DER}"/>',
        pill(110, 132, 300, "ZONA IZQUIERDA  ·  verde", Z_IZQ_INK),
        pill(1750, 132, 280, "ZONA CENTRO  ·  amarillo", Z_CEN_INK),
        pill(3180, 132, 280, "ZONA DERECHA  ·  azul", Z_DER_INK),
        '<line x1="1268" y1="176" x2="1268" y2="1500" stroke="#9AA8B6" stroke-width="2" stroke-dasharray="7 8"/>',
        '<line x1="2532" y1="176" x2="2532" y2="1500" stroke="#9AA8B6" stroke-width="2" stroke-dasharray="7 8"/>',
        # corridor network
        corridor(110, 188, 3480, 292),   # north imaging spine
        corridor(110, 1188, 3480, 270),  # south access spine
        corridor(470, 470, 168, 730),    # left vertical
        corridor(1760, 470, 188, 730),   # center vertical
        corridor(2860, 470, 178, 730),   # right vertical
        corridor(110, 470, 370, 430),    # cardio wing
        corridor(3030, 470, 560, 730),   # nuclear / consultas wing
        corridor(630, 780, 1140, 78),    # izq-centro link
        corridor(1940, 780, 930, 78),    # centro-der link
        text(1268, 816, ["conexión izquierda · centro"], 11, "600", MUTED),
        text(2532, 816, ["conexión centro · derecha"], 11, "600", MUTED),
        text(1900, 206, ["Pasillo de imagen  ·  radiología"], 12, "600", MUTED),
        text(1900, 1440, ["Pasillo de accesos  ·  fachada principal (sur)"], 12, "600", MUTED),
        # north arrow
        '<g transform="translate(3618, 210)">'
        '<polygon points="0,-26 9,8 -9,8" fill="#1B2430"/>'
        '<text x="0" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#1B2430">N</text>'
        "</g>",
    ]

    rooms = [
        # izquierda norte
        Box(128, 220, 250, 118, "TAC cardiaco", "cardio", "Imagen cardiaca"),
        Box(128, 490, 250, 118, "Unidad cardiovascular", "cardio"),
        Box(128, 622, 250, 130, "Hospital de día hemodinamia", "cardio"),
        Box(400, 220, 270, 118, "Radiología vascular", "radio"),
        Box(400, 352, 270, 108, "Cabinas 1–9", "radio", "Rayos / Eco"),
        Box(690, 220, 200, 240, "Baños", "aseo", "Zona izquierda"),
        # centro norte — fila de rayos
        Box(1290, 220, 190, 240, "Cabinas 12–13", "radio", "Tórax / abdomen cama-silla"),
        Box(1495, 220, 190, 240, "Rayos cabinas 10–18", "radio"),
        Box(1700, 220, 190, 240, "Rayos cabinas 20–26", "radio"),
        Box(1905, 220, 195, 240, "Rayos calle 40–47", "radio"),
        Box(2115, 220, 195, 240, "Rayos calle 48–56", "radio"),
        Box(2325, 220, 180, 240, "Resonancia 57–58", "radio"),
        # derecha norte
        Box(2560, 220, 185, 118, "Eco pediátrica", "pedia", "Cabinas 74–76"),
        Box(2760, 220, 175, 118, "TAC 5", "radio", "Cabinas 70–72"),
        Box(2950, 220, 120, 118, "TAC 2", "radio"),
        Box(2560, 352, 185, 108, "Cabinas 80–83", "radio"),
        Box(2760, 352, 310, 108, "TAC 1–4 camas", "radio"),
        Box(3090, 220, 260, 118, "Medicina nuclear", "nuclear"),
        Box(3090, 352, 260, 108, "Gamma cámaras", "nuclear"),
        Box(3370, 220, 200, 240, "PET-TAC", "nuclear"),
        # eje centro
        Box(1575, 490, 165, 250, "Secretaría", "servicio", "Eje central"),
        Box(1980, 490, 155, 100, "Seguridad", "servicio"),
        Box(2150, 490, 140, 100, "Cajero", "servicio"),
        Box(2310, 490, 145, 100, "Baños", "aseo"),
        Box(1575, 980, 165, 95, "Baños", "aseo"),
        Box(1575, 1090, 165, 80, "Escaleras", "stair"),
        # izquierda circulación
        Box(670, 490, 175, 100, "Baños", "aseo"),
        Box(670, 980, 175, 95, "Baños", "aseo"),
        Box(670, 1090, 175, 80, "Escaleras", "stair", "Izquierda"),
        # derecha circulación + consultas
        Box(2570, 490, 175, 215, "Philips", "servicio"),
        Box(2570, 980, 175, 95, "Baños", "aseo"),
        Box(2570, 1090, 175, 80, "Escaleras", "stair", "Derecha"),
        Box(3070, 490, 500, 95, "Consulta 119 densitometría", "consulta"),
        Box(3070, 600, 240, 95, "Consulta 118", "consulta"),
        Box(3330, 600, 240, 95, "Consultas 110–112", "consulta"),
        Box(3070, 710, 500, 95, "Baños", "aseo", "Zona derecha"),
    ]
    out.extend(room(b) for b in rooms)

    # elevators
    out += [
        elevator(300, 1220, 230, 200, ELEV["izq"], ["Ascensores", "izquierda"]),
        elevator(470, 960, 168, 175, ELEV["marron"], ["Ascensores", "marrones"]),
        elevator(1760, 1220, 230, 200, ELEV["centro"], ["Ascensores", "centro"]),
        elevator(2030, 960, 230, 175, ELEV["centro"], ["Ascensores", "centro derecho"]),
        elevator(1760, 620, 188, 175, ELEV["rojo"], ["Ascensores", "rojos"]),
        elevator(2030, 620, 280, 175, ELEV["grandes"], ["Grandes ascensores DG", "y pequeños"]),
        elevator(2860, 620, 178, 175, ELEV["verde"], ["Ascensores", "verdes"]),
        elevator(2860, 960, 178, 175, ELEV["grandes"], ["Grandes ascensores G", "y pequeños"]),
        elevator(3180, 1220, 230, 200, ELEV["derecha"], ["Ascensores", "derecha"]),
    ]

    # doors + info
    out += [
        door(128, 1245, 155, 170, "Salida"),
        door(1575, 1245, 165, 170, "Entrada", primary=True),
        door(3480, 1245, 155, 170, "Salida"),
        rect(1400, 1268, 150, 125, 12, "#1A5FA8"),
        f'<circle cx="1475" cy="1302" r="13" fill="#fff"/>'
        f'<text x="1475" y="1307" text-anchor="middle" font-size="16" font-weight="700" fill="#1A5FA8">i</text>',
        text(1475, 1355, ["Información"], 13, "700", WHITE),
        room(Box(2570, 1245, 200, 170, "Atención al paciente", "servicio")),
    ]

    # legend
    out.append(rect(78, 1568, 3648, 160, 16, WHITE, WALL, 1.5))
    out.append(text(170, 1600, ["Leyenda"], 16, "700", INK))
    legend = [
        (280, "Cardiología / hemodinamia", "cardio"),
        (720, "Radiología / imagen", "radio"),
        (1100, "Pediatría", "pedia"),
        (1360, "Medicina nuclear", "nuclear"),
        (1740, "Consultas", "consulta"),
        (2060, "Servicios", "servicio"),
        (2360, "Aseos", "aseo"),
        (2600, "Escaleras", "stair"),
    ]
    for x, label, kind in legend:
        fill, accent = CAT[kind]
        out.append(rect(x, 1632, 30, 30, 5, fill, "#C9D3DC", 1))
        out.append(f'<rect x="{x}" y="1632" width="7" height="30" rx="2" fill="{accent}"/>')
        out.append(
            f'<text x="{x+40}" y="1653" font-size="14" font-weight="500" fill="{INK}">{esc(label)}</text>'
        )
    out.append(
        f'<text x="120" y="1698" font-size="14" font-weight="600" fill="{MUTED}">Ascensores:</text>'
    )
    chips = [
        (250, ELEV["izq"], "Izquierda / verdes"),
        (520, ELEV["marron"], "Marrones"),
        (710, ELEV["centro"], "Centro"),
        (880, ELEV["rojo"], "Rojos"),
        (1030, ELEV["derecha"], "Derecha"),
        (1210, ELEV["grandes"], "Grandes DG / G"),
    ]
    for x, color, label in chips:
        out.append(rect(x, 1682, 20, 20, 4, color))
        out.append(
            f'<text x="{x+28}" y="1698" font-size="14" font-weight="500" fill="{INK}">{esc(label)}</text>'
        )
    out.append(
        f'<text x="3688" y="1698" text-anchor="end" font-size="13" fill="{MUTED}">'
        "Entradas de la fachada principal al sur del plano. Colores de zona según la señalética del hospital.</text>"
    )
    out.append("</svg>")
    return "\n".join(out)


def main() -> None:
    svg_path = OUT / "planta-0-ramon-y-cajal.svg"
    svg_path.write_text(build(), encoding="utf-8")
    print(f"Wrote {svg_path}")


if __name__ == "__main__":
    main()
