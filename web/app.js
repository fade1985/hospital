/* Visor 2D del Hospital Universitario Ramón y Cajal.
 *
 * Dos vistas:
 *  - "planta": esquema de la planta tipo del edificio principal (3 zonas x 3
 *    bloques) con el directorio oficial de servicios de la planta elegida.
 *  - "recinto": geometría georreferenciada del recinto tomada de OpenStreetMap.
 */

const D = window.DATOS;
const G = D.hospital.geometria_planta;
const SVGNS = "http://www.w3.org/2000/svg";

const ZONAS = new Map(D.hospital.zonas.map((z) => [z.id, z]));
const PLANTAS = D.hospital.plantas;
const BLOQUES = D.hospital.bloques.map((b) => b.id);
const PLANTAS_CON_POSTERIOR = new Set(
  D.hospital.circulaciones.find((c) => c.id === "posterior").plantas,
);

const GRIS_ALA = "#e6e5df";
const GRIS_FACHADA = "#dfe2dc";
const TRAZO = "#8d968e";

const estado = {
  vista: "planta",
  planta: "0",
  seleccion: null, // { zona, bloque }
  verViales: true,
  encuadre: null,
};

const $ = (sel) => document.querySelector(sel);
const svg = $("#mapa");

/* -- utilidades ---------------------------------------------------------- */

function el(tag, atributos = {}, hijos = []) {
  const nodo = document.createElementNS(SVGNS, tag);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor !== null && valor !== undefined) nodo.setAttribute(clave, String(valor));
  }
  for (const hijo of [].concat(hijos)) {
    nodo.appendChild(typeof hijo === "string" ? document.createTextNode(hijo) : hijo);
  }
  return nodo;
}

const normalizar = (texto) =>
  (texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const nombrePlanta = (id) => PLANTAS.find((p) => p.id === id)?.nombre ?? id;

/* -- geometría del abanico ---------------------------------------------- */

/** Convierte una coordenada (u, r) del abanico a coordenadas del lienzo.
 *  `u` va de -1 (extremo izquierdo del plano) a +1 (extremo derecho);
 *  `r` es la distancia al punto de fuga situado delante de la fachada. */
function punto(u, r) {
  const t = (u * G.apertura_grados * Math.PI) / 180;
  return [G.pivote.x + r * Math.sin(t), G.pivote.y - r * Math.cos(t)];
}

/** Cuadrilátero curvo entre los ángulos u0..u1 y los radios r0..r1. */
function banda(u0, u1, r0, r1, pasos = 10) {
  const puntos = [];
  for (let i = 0; i <= pasos; i++) puntos.push(punto(u0 + ((u1 - u0) * i) / pasos, r1));
  for (let i = pasos; i >= 0; i--) puntos.push(punto(u0 + ((u1 - u0) * i) / pasos, r0));
  return puntos;
}

const trazado = (puntos) =>
  puntos.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ") + " Z";

const bandaTrazado = (u0, u1, r0, r1) => trazado(banda(u0, u1, r0, r1));

/** Ancho de arco en unidades del lienzo, para calcular cuánto texto cabe. */
const arco = (u0, u1, r) => Math.abs(u1 - u0) * ((G.apertura_grados * Math.PI) / 180) * r;

/* -- directorio ---------------------------------------------------------- */

function ubicacionesDe(planta, zona, bloque) {
  return D.ubicaciones.filter(
    (u) =>
      u.planta === planta &&
      (zona === undefined || u.zona === zona) &&
      (bloque === undefined || u.bloque === bloque),
  );
}

const etiquetaServicio = (u) => u.servicio ?? `Habitaciones ${u.habitaciones}`;

/** Números de habitación que cubre un texto como "315 a 318 y 335 a 342". */
function habitacionesIncluye(texto, numero) {
  if (!texto) return false;
  for (const trozo of texto.split(/\s*y\s*/)) {
    const rango = trozo.match(/(\d+)\s*(?:a|-|–)\s*(\d+)/);
    if (rango) {
      const [a, b] = [Number(rango[1]), Number(rango[2])];
      if (numero >= Math.min(a, b) && numero <= Math.max(a, b)) return true;
    } else {
      const suelto = trozo.match(/\d+/);
      if (suelto && Number(suelto[0]) === numero) return true;
    }
  }
  return false;
}

/* -- texto en el lienzo -------------------------------------------------- */

function partirTexto(texto, maxCaracteres) {
  const lineas = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    if (!actual) actual = palabra;
    else if ((actual + " " + palabra).length <= maxCaracteres) actual += " " + palabra;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function bloqueTexto(lineas, x, y, giro, opciones = {}) {
  const { tamano = 6.2, interlineado = 7.4, color = "#22302a", peso = 500 } = opciones;
  const grupo = el("g", {
    class: "rotulo",
    transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${giro.toFixed(2)})`,
  });
  const inicio = -((lineas.length - 1) * interlineado) / 2;
  lineas.forEach((linea, i) => {
    grupo.appendChild(
      el(
        "text",
        {
          x: 0,
          y: (inicio + i * interlineado).toFixed(2),
          "font-size": linea.tamano ?? tamano,
          "font-weight": linea.peso ?? peso,
          fill: linea.color ?? color,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
        },
        linea.texto ?? linea,
      ),
    );
  });
  return grupo;
}

/** Cartela con título y advertencia, para que el SVG descargado se explique solo. */
function pieDeMapa(x, y, titulo, ...notas) {
  const grupo = el("g", { class: "rotulo" });
  grupo.appendChild(el("text", { x, y, "font-size": 9, "font-weight": 700, fill: "#3c463f" }, titulo));
  notas.forEach((nota, i) => {
    grupo.appendChild(el("text", { x, y: y + 11 + i * 10, "font-size": 7, fill: "#7a827b" }, nota));
  });
  return grupo;
}

/* -- vista: planta ------------------------------------------------------- */

function dibujarPlanta() {
  const planta = estado.planta;
  const capaBase = el("g");
  const capaTexto = el("g");
  const conPosterior = PLANTAS_CON_POSTERIOR.has(planta);

  // Fachada principal y hall.
  capaBase.appendChild(
    el("path", {
      d: bandaTrazado(G.fachada_u[0], G.fachada_u[1], G.radios.fachada[0], G.radios.fachada[1]),
      fill: GRIS_FACHADA,
      stroke: TRAZO,
      "stroke-width": 0.9,
    }),
  );
  const centroFachada = punto(
    (G.fachada_u[0] + G.fachada_u[1]) / 2,
    (G.radios.fachada[0] + G.radios.fachada[1]) / 2,
  );
  capaTexto.appendChild(
    bloqueTexto(
      planta === "0" ? ["Hall principal", "Fachada principal"] : ["Fachada principal"],
      centroFachada[0],
      centroFachada[1],
      ((G.fachada_u[0] + G.fachada_u[1]) / 2) * G.apertura_grados,
      { tamano: 6.6, color: "#4d574f", peso: 600 },
    ),
  );

  // Alas laterales: forman parte del edificio pero el directorio oficial de
  // zonas no las desglosa, así que se dibujan en gris neutro.
  for (const [lado, rango] of Object.entries(G.brazos_u)) {
    capaBase.appendChild(
      el(
        "path",
        {
          d: bandaTrazado(rango[0], rango[1], G.radios.brazos[0], G.radios.brazos[1]),
          fill: GRIS_ALA,
          stroke: TRAZO,
          "stroke-width": 0.9,
        },
        [el("title", {}, `Ala lateral ${lado} — no desglosada en el directorio oficial de zonas`)],
      ),
    );
    const centro = punto(
      (rango[0] + rango[1]) / 2,
      (G.radios.brazos[0] + G.radios.brazos[1]) / 2,
    );
    capaTexto.appendChild(
      bloqueTexto(
        ["Ala", "lateral"],
        centro[0],
        centro[1],
        ((rango[0] + rango[1]) / 2) * G.apertura_grados,
        { tamano: 6, color: "#7a827b", peso: 500 },
      ),
    );
  }

  for (const zona of D.hospital.zonas) {
    const [u0, u1] = G.sectores_u[zona.id];
    const uMedio = (u0 + u1) / 2;
    const giro = uMedio * G.apertura_grados;

    // Pasillo de comunicación anterior: existe en todas las plantas.
    capaBase.appendChild(
      el(
        "path",
        {
          d: bandaTrazado(u0, u1, G.radios.conector_anterior[0], G.radios.conector_anterior[1]),
          fill: zona.color,
          "fill-opacity": 0.85,
        },
        [el("title", {}, "Comunicación anterior entre las tres zonas (todas las plantas)")],
      ),
    );

    // Comunicación posterior: solo del sótano -5 a la planta 2.
    capaBase.appendChild(
      el(
        "path",
        {
          d: bandaTrazado(u0, u1, G.radios.conector_posterior[0], G.radios.conector_posterior[1]),
          fill: conPosterior ? zona.color : "#f2f2ee",
          "fill-opacity": conPosterior ? 0.85 : 1,
          stroke: conPosterior ? "none" : "#c3c8c0",
          "stroke-width": 0.7,
          "stroke-dasharray": conPosterior ? null : "3 2.5",
        },
        [
          el(
            "title",
            {},
            conPosterior
              ? "Comunicación posterior (existe del sótano -5 a la planta 2)"
              : "Sin comunicación posterior en esta planta",
          ),
        ],
      ),
    );

    for (const bloque of BLOQUES) {
      const [r0, r1] = G.radios[bloque];
      const entradas = ubicacionesDe(planta, zona.id, bloque);
      const elegida =
        estado.seleccion && estado.seleccion.zona === zona.id && estado.seleccion.bloque === bloque;

      const celda = el(
        "path",
        {
          d: bandaTrazado(u0, u1, r0, r1),
          fill: entradas.length ? zona.color_suave : "#f7f7f4",
          stroke: elegida ? zona.color : TRAZO,
          "stroke-width": elegida ? 2.4 : 0.9,
          class: "celda" + (elegida ? " esta-elegida" : ""),
          "data-zona": zona.id,
          "data-bloque": bloque,
          tabindex: 0,
          role: "button",
          "aria-label": `Zona ${zona.nombre}, bloque ${bloque}, ${entradas.length} servicios`,
        },
        [
          el(
            "title",
            {},
            `${zona.nombre} · Bloque ${bloque} · ${nombrePlanta(planta)} — ${
              entradas.length || "sin"
            } servicio${entradas.length === 1 ? "" : "s"} en el directorio`,
          ),
        ],
      );
      capaBase.appendChild(celda);

      // Espina de señalética: la franja pintada del color de la zona.
      const [e0, e1] = G.espinas_u[zona.id];
      capaBase.appendChild(
        el("path", {
          d: bandaTrazado(e0, e1, r0, r1),
          fill: zona.color,
          "fill-opacity": 0.2,
          "pointer-events": "none",
        }),
      );

      const rMedio = (r0 + r1) / 2;
      const centro = punto(uMedio, rMedio);
      const maxCaracteres = Math.max(11, Math.floor(arco(u0, u1, rMedio) / 3.2));
      const lineas = [];
      const maxLineas = 7;
      for (const entrada of entradas) {
        const partes = partirTexto(etiquetaServicio(entrada), maxCaracteres);
        if (lineas.length + partes.length > maxLineas) {
          const restantes = entradas.length - entradas.indexOf(entrada);
          lineas.push({ texto: `+${restantes} más`, color: "#6d766f", peso: 600 });
          break;
        }
        for (const parte of partes) lineas.push({ texto: parte });
        if (entrada.servicio && entrada.habitaciones && lineas.length < maxLineas) {
          lineas.push({ texto: `hab. ${entrada.habitaciones}`, tamano: 5.2, color: "#6d766f" });
        }
      }
      if (!lineas.length) lineas.push({ texto: "—", color: "#a8afa8" });
      capaTexto.appendChild(bloqueTexto(lineas, centro[0], centro[1], giro));
    }

    // Rótulo de la zona, por delante del fondo del edificio.
    const chip = punto(uMedio, G.radios.conector_posterior[1] + 26);
    capaTexto.appendChild(
      el("rect", {
        x: chip[0] - 34,
        y: chip[1] - 8,
        width: 68,
        height: 16,
        rx: 8,
        fill: zona.color,
      }),
    );
    capaTexto.appendChild(
      el(
        "text",
        {
          x: chip[0],
          y: chip[1] + 0.4,
          "font-size": 8,
          "font-weight": 700,
          fill: "#fff",
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          class: "rotulo",
        },
        zona.nombre.toUpperCase(),
      ),
    );
  }

  // Rótulos de bloque, fuera del abanico y con una guía radial hasta el borde.
  for (const bloque of BLOQUES) {
    const [r0, r1] = G.radios[bloque];
    const rMedio = (r0 + r1) / 2;
    const desde = punto(1.03, rMedio);
    const hasta = punto(1.11, rMedio);
    capaTexto.appendChild(
      el("path", {
        d: `M${desde[0].toFixed(2)},${desde[1].toFixed(2)} L${hasta[0].toFixed(2)},${hasta[1].toFixed(2)}`,
        stroke: "#c3c8c0",
        "stroke-width": 0.7,
        "stroke-dasharray": "2 2",
      }),
    );
    const p = punto(1.18, rMedio);
    capaTexto.appendChild(
      bloqueTexto([`Bloque ${bloque}`], p[0], p[1], 1.18 * G.apertura_grados, {
        tamano: 7,
        color: "#8a928b",
        peso: 700,
      }),
    );
  }

  capaTexto.appendChild(
    pieDeMapa(
      -252,
      344,
      `${nombrePlanta(planta)} · edificio principal · Hospital Universitario Ramón y Cajal`,
      "Esquema según el plano oficial de zonas. Se entra por la parte inferior: el norte real queda hacia abajo.",
      "Datos: Guía del paciente del hospital (Comunidad de Madrid). Esquema orientativo, no es un plano de proyecto.",
    ),
  );

  svg.appendChild(capaBase);
  svg.appendChild(capaTexto);

  for (const celda of svg.querySelectorAll(".celda")) {
    const elegir = () => seleccionar(celda.dataset.zona, celda.dataset.bloque);
    celda.addEventListener("click", elegir);
    celda.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        elegir();
      }
    });
  }

  return { x: -260, y: 30, ancho: 650, alto: 350 };
}

/* -- vista: recinto ------------------------------------------------------ */

const COLOR_RECINTO = {
  "edificio-principal": "#f0b184",
  urgencias: "#d9534f",
  "anexo-posterior": "#f6f6f3",
  "pabellon-docente": "#9d9d97",
  apeadero: "#b7a894",
  "apeadero-acceso-3": "#b7a894",
};

function anillos(xy, tipo) {
  if (tipo === "Polygon") return xy;
  if (tipo === "MultiPolygon") return xy.flat();
  return [xy];
}

function dibujarRecinto() {
  const capaSuelo = el("g");
  const capaViales = el("g", {
    fill: "none",
    stroke: "#d6d6cf",
    "stroke-width": 1.4,
    "stroke-linecap": "round",
    display: estado.verViales ? null : "none",
  });
  const capaVia = el("g", {
    fill: "none",
    stroke: "#b4b0a4",
    "stroke-width": 1.2,
    "stroke-dasharray": "5 3",
  });
  const capaEdificios = el("g");
  const capaTexto = el("g");

  for (const f of D.recinto.features) {
    const rings = anillos(f.xy, f.tipoGeom);

    if (f.id === "recinto") {
      for (const r of rings) {
        capaSuelo.appendChild(
          el("path", { d: trazado(r), fill: "#eaf0e4", stroke: "#cbd8c0", "stroke-width": 1.2 }),
        );
      }
      continue;
    }
    if (f.amenity === "parking") {
      for (const r of rings) {
        capaSuelo.appendChild(el("path", { d: trazado(r), fill: "#f0efe8" }));
      }
      continue;
    }
    if (f.tipoGeom === "LineString") {
      const capa = f.railway ? capaVia : capaViales;
      capa.appendChild(
        el("path", {
          d: f.xy.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" "),
        }),
      );
      continue;
    }
    if (f.tipoGeom === "Point") continue;

    const destacado = Boolean(f.id);
    const relleno = COLOR_RECINTO[f.id] ?? (destacado ? "#e2e2db" : "#e0e0d8");
    for (const r of rings) {
      capaEdificios.appendChild(
        el(
          "path",
          {
            d: trazado(r),
            fill: relleno,
            "fill-opacity": destacado ? 1 : 0.55,
            stroke: destacado ? "#6f7770" : "#c8c8c0",
            "stroke-width": destacado ? 1.1 : 0.6,
          },
          f.nombre || f.name ? [el("title", {}, f.nombre ?? f.name)] : [],
        ),
      );
    }

    if (destacado && f.id !== "anexo-posterior") {
      const puntos = rings.flat();
      const cx = puntos.reduce((s, p) => s + p[0], 0) / puntos.length;
      const cy = puntos.reduce((s, p) => s + p[1], 0) / puntos.length;
      capaTexto.appendChild(
        bloqueTexto(partirTexto(f.nombre, 22), cx, cy, 0, {
          tamano: 7,
          interlineado: 8.4,
          color: "#1d2420",
          peso: 650,
        }),
      );
    }
  }

  // Rosa de los vientos.
  const brujula = el("g", { transform: "translate(210 -105)" });
  brujula.appendChild(el("circle", { r: 15, fill: "#fff", stroke: "#c9cec5", "stroke-width": 1 }));
  brujula.appendChild(el("path", { d: "M0,-11 L4,4 L0,1.5 L-4,4 Z", fill: "#3c463f" }));
  brujula.appendChild(
    el(
      "text",
      {
        y: -17,
        "font-size": 8,
        "font-weight": 700,
        fill: "#3c463f",
        "text-anchor": "middle",
        class: "rotulo",
      },
      "N",
    ),
  );

  // Escala gráfica de 100 m.
  const escala = el("g", { transform: "translate(-215 130)" });
  escala.appendChild(el("path", { d: "M0,0 H100", stroke: "#3c463f", "stroke-width": 1.6 }));
  escala.appendChild(el("path", { d: "M0,-4 V4 M100,-4 V4", stroke: "#3c463f", "stroke-width": 1.6 }));
  escala.appendChild(
    el(
      "text",
      { x: 50, y: -7, "font-size": 8, fill: "#3c463f", "text-anchor": "middle", class: "rotulo" },
      "100 m",
    ),
  );

  capaTexto.appendChild(
    pieDeMapa(
      -232,
      152,
      "Recinto del Hospital Universitario Ramón y Cajal",
      "Norte arriba. Geometría © colaboradores de OpenStreetMap, ODbL 1.0.",
    ),
  );

  svg.append(capaSuelo, capaViales, capaVia, capaEdificios, capaTexto, brujula, escala);
  return { x: -240, y: -150, ancho: 505, alto: 340 };
}

/* -- encuadre, zoom y desplazamiento ------------------------------------ */

function aplicarEncuadre(encuadre) {
  estado.encuadre = encuadre;
  svg.setAttribute("viewBox", `${encuadre.x} ${encuadre.y} ${encuadre.ancho} ${encuadre.alto}`);
}

let encuadreInicial = null;

function activarInteraccion() {
  let arrastrando = false;
  let ultimo = null;

  svg.addEventListener("pointerdown", (ev) => {
    if (ev.target.classList.contains("celda")) return;
    arrastrando = true;
    ultimo = [ev.clientX, ev.clientY];
    svg.classList.add("esta-arrastrando");
    svg.setPointerCapture(ev.pointerId);
  });

  svg.addEventListener("pointermove", (ev) => {
    if (!arrastrando) return;
    const caja = svg.getBoundingClientRect();
    const escala = estado.encuadre.ancho / caja.width;
    aplicarEncuadre({
      ...estado.encuadre,
      x: estado.encuadre.x - (ev.clientX - ultimo[0]) * escala,
      y: estado.encuadre.y - (ev.clientY - ultimo[1]) * escala,
    });
    ultimo = [ev.clientX, ev.clientY];
  });

  const soltar = (ev) => {
    arrastrando = false;
    svg.classList.remove("esta-arrastrando");
    if (ev.pointerId !== undefined && svg.hasPointerCapture?.(ev.pointerId)) {
      svg.releasePointerCapture(ev.pointerId);
    }
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);

  svg.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      const caja = svg.getBoundingClientRect();
      const factor = Math.exp(ev.deltaY * 0.0012);
      const { x, y, ancho, alto } = estado.encuadre;
      const px = x + ((ev.clientX - caja.left) / caja.width) * ancho;
      const py = y + ((ev.clientY - caja.top) / caja.height) * alto;
      const nuevoAncho = Math.min(Math.max(ancho * factor, 60), 4000);
      const nuevoAlto = (nuevoAncho * alto) / ancho;
      aplicarEncuadre({
        x: px - ((px - x) * nuevoAncho) / ancho,
        y: py - ((py - y) * nuevoAlto) / alto,
        ancho: nuevoAncho,
        alto: nuevoAlto,
      });
    },
    { passive: false },
  );
}

/* -- panel lateral ------------------------------------------------------- */

function pintarSelectorPlantas() {
  const contenedor = $("#plantas");
  contenedor.textContent = "";
  for (const planta of PLANTAS) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = planta.id.startsWith("S") ? planta.id.replace("S", "-") : planta.id;
    boton.title = planta.nombre;
    boton.setAttribute("role", "radio");
    boton.setAttribute("aria-checked", String(planta.id === estado.planta));
    if (planta.id === estado.planta) boton.classList.add("es-activo");
    boton.addEventListener("click", () => irA(planta.id));
    contenedor.appendChild(boton);
  }
}

function pintarLeyenda() {
  const lista = $("#leyenda");
  lista.textContent = "";
  const filas =
    estado.vista === "planta"
      ? [
          ...D.hospital.zonas.map((z) => ({
            color: z.color,
            texto: `Zona ${z.nombre} (señalética ${z.color_senaletica})`,
            nota: `lado ${z.lado_real} real`,
          })),
          { color: GRIS_FACHADA, texto: "Fachada principal y hall" },
          { color: GRIS_ALA, texto: "Alas laterales, sin desglose oficial" },
          { color: "#f2f2ee", texto: "Sin comunicación posterior en esta planta" },
        ]
      : [
          { color: COLOR_RECINTO["edificio-principal"], texto: "Edificio principal" },
          { color: COLOR_RECINTO.urgencias, texto: "Urgencias" },
          { color: COLOR_RECINTO["pabellon-docente"], texto: "Pabellón Docente y Consultas Externas" },
          { color: COLOR_RECINTO.apeadero, texto: "Apeadero de Cercanías" },
          { color: "#e0e0d8", texto: "Otras edificaciones del entorno" },
          { color: "#eaf0e4", texto: "Parcela hospitalaria" },
        ];

  for (const fila of filas) {
    const li = document.createElement("li");
    const muestra = document.createElement("span");
    muestra.className = "leyenda__muestra";
    muestra.style.background = fila.color;
    li.append(muestra);
    const texto = document.createElement("span");
    texto.textContent = fila.texto;
    if (fila.nota) {
      const nota = document.createElement("span");
      nota.className = "leyenda__nota";
      nota.textContent = ` · ${fila.nota}`;
      texto.append(nota);
    }
    li.append(texto);
    lista.append(li);
  }
}

function pintarDetalle() {
  const cuerpo = $("#detalle-cuerpo");
  cuerpo.textContent = "";

  if (estado.vista === "recinto") {
    const p = document.createElement("p");
    p.className = "detalle__vacio";
    p.textContent =
      "Vista georreferenciada del recinto, con el norte arriba. Pasa el cursor por encima de los edificios para ver su nombre y cambia a la vista de plantas para consultar los servicios.";
    cuerpo.append(p);
    return;
  }

  if (!estado.seleccion) {
    const p = document.createElement("p");
    p.className = "detalle__vacio";
    p.textContent = "Pulsa un bloque del plano para ver todos los servicios que alberga.";
    cuerpo.append(p);
    return;
  }

  const { zona, bloque } = estado.seleccion;
  const info = ZONAS.get(zona);
  const entradas = ubicacionesDe(estado.planta, zona, bloque);

  const titulo = document.createElement("h3");
  titulo.textContent = `${info.nombre} · Bloque ${bloque}`;
  const donde = document.createElement("p");
  donde.className = "detalle__donde";
  donde.textContent = `${nombrePlanta(estado.planta)} · señalética ${info.color_senaletica} · ${
    D.hospital.bloques.find((b) => b.id === bloque).descripcion.toLowerCase()
  }`;
  cuerpo.append(titulo, donde);

  if (!entradas.length) {
    const p = document.createElement("p");
    p.className = "detalle__vacio";
    p.textContent = "El plano oficial no recoge servicios en este bloque.";
    cuerpo.append(p);
  } else {
    const lista = document.createElement("ul");
    for (const entrada of entradas) {
      const li = document.createElement("li");
      li.textContent = etiquetaServicio(entrada);
      if (entrada.servicio && entrada.habitaciones) {
        const hab = document.createElement("span");
        hab.className = "detalle__habitaciones";
        hab.textContent = ` · hab. ${entrada.habitaciones}`;
        li.append(hab);
      }
      lista.append(li);
    }
    cuerpo.append(lista);
  }

  const aviso = document.createElement("p");
  aviso.className = "detalle__aviso";
  aviso.textContent =
    "La planta y la zona salen directamente del plano oficial. La letra del bloque es orientativa: el plano dispone cada zona en tres columnas sin rotularlas.";
  cuerpo.append(aviso);
}

/* -- buscador ------------------------------------------------------------ */

function buscar(consulta) {
  const texto = normalizar(consulta).trim();
  if (texto.length < 2) return [];
  const numero = /^\d+$/.test(texto) ? Number(texto) : null;

  const encontrados = D.ubicaciones.filter((u) => {
    if (numero !== null && habitacionesIncluye(u.habitaciones, numero)) return true;
    return normalizar(etiquetaServicio(u)).includes(texto);
  });

  return encontrados.slice(0, 60);
}

function pintarResultados(consulta) {
  const lista = $("#resultados");
  lista.textContent = "";
  const encontrados = buscar(consulta);

  if (normalizar(consulta).trim().length < 2) {
    lista.hidden = true;
    return;
  }
  lista.hidden = false;

  if (!encontrados.length) {
    const li = document.createElement("li");
    li.className = "resultados__vacio";
    li.textContent = "Sin resultados en el directorio oficial.";
    lista.append(li);
    return;
  }

  for (const u of encontrados) {
    const li = document.createElement("li");
    const boton = document.createElement("button");
    boton.type = "button";

    const servicio = document.createElement("span");
    servicio.className = "resultados__servicio";
    servicio.textContent = etiquetaServicio(u);

    const donde = document.createElement("span");
    donde.className = "resultados__donde";
    donde.textContent =
      `${nombrePlanta(u.planta)} · ${ZONAS.get(u.zona).nombre} · bloque ${u.bloque}` +
      (u.servicio && u.habitaciones ? ` · hab. ${u.habitaciones}` : "");

    boton.append(servicio, donde);
    boton.addEventListener("click", () => {
      cambiarVista("planta");
      irA(u.planta, { zona: u.zona, bloque: u.bloque });
    });
    li.append(boton);
    lista.append(li);
  }
}

/* -- orquestación -------------------------------------------------------- */

function redibujar({ conservarEncuadre = false } = {}) {
  svg.textContent = "";
  const encuadre = estado.vista === "planta" ? dibujarPlanta() : dibujarRecinto();
  encuadreInicial = encuadre;
  if (!conservarEncuadre || !estado.encuadre) aplicarEncuadre(encuadre);
  else aplicarEncuadre(estado.encuadre);

  $("#titulo-vista").textContent =
    estado.vista === "planta"
      ? `${nombrePlanta(estado.planta)} · edificio principal`
      : "Recinto hospitalario";
  $("#nota-orientacion").textContent =
    estado.vista === "planta"
      ? "Vista según la señalética del hospital: se entra por abajo, el norte real queda hacia abajo."
      : "Norte arriba · geometría de OpenStreetMap";
  $("#selector-plantas").hidden = estado.vista !== "planta";
  $("#btn-viales").hidden = estado.vista !== "recinto";
  pintarLeyenda();
  pintarDetalle();
}

function seleccionar(zona, bloque) {
  estado.seleccion = { zona, bloque };
  redibujar({ conservarEncuadre: true });
}

function irA(planta, seleccion = null) {
  estado.planta = planta;
  estado.seleccion = seleccion;
  pintarSelectorPlantas();
  redibujar({ conservarEncuadre: true });
}

function cambiarVista(vista) {
  if (estado.vista === vista) return;
  estado.vista = vista;
  estado.encuadre = null;
  for (const boton of document.querySelectorAll(".vistas button")) {
    boton.classList.toggle("es-activo", boton.dataset.vista === vista);
  }
  redibujar();
}

function descargarSVG() {
  const copia = svg.cloneNode(true);
  copia.setAttribute("xmlns", SVGNS);
  const estilo = document.createElementNS(SVGNS, "style");
  estilo.textContent =
    ".rotulo{font-family:Inter,'Segoe UI',system-ui,sans-serif}text{font-family:Inter,'Segoe UI',system-ui,sans-serif}";
  copia.insertBefore(estilo, copia.firstChild);

  const nombre =
    estado.vista === "planta"
      ? `ryc-planta-${estado.planta}.svg`
      : "ryc-recinto.svg";
  const blob = new Blob([new XMLSerializer().serializeToString(copia)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function iniciar() {
  pintarSelectorPlantas();
  redibujar();
  activarInteraccion();

  for (const boton of document.querySelectorAll(".vistas button")) {
    boton.addEventListener("click", () => cambiarVista(boton.dataset.vista));
  }

  $("#buscador").addEventListener("input", (ev) => pintarResultados(ev.target.value));
  $("#btn-encajar").addEventListener("click", () => aplicarEncuadre({ ...encuadreInicial }));
  $("#btn-descargar").addEventListener("click", descargarSVG);
  $("#btn-viales").addEventListener("click", () => {
    estado.verViales = !estado.verViales;
    $("#btn-viales").classList.toggle("es-activo", estado.verViales);
    redibujar({ conservarEncuadre: true });
  });

  document.addEventListener("keydown", (ev) => {
    if (estado.vista !== "planta") return;
    if (ev.target.tagName === "INPUT") return;
    if (ev.key !== "ArrowUp" && ev.key !== "ArrowDown") return;
    ev.preventDefault();
    const i = PLANTAS.findIndex((p) => p.id === estado.planta);
    const siguiente = PLANTAS[ev.key === "ArrowUp" ? Math.max(0, i - 1) : Math.min(PLANTAS.length - 1, i + 1)];
    irA(siguiente.id, estado.seleccion);
  });
}

iniciar();
