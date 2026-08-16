# Mapa 2D del Hospital Universitario Ramón y Cajal

Visor web estático con dos mapas del hospital (Carretera de Colmenar Viejo km 9,100, Madrid):

- **Plantas**: esquema 2D de la planta tipo del edificio principal, con sus tres zonas
  (Izquierda, Centro y Derecha) y sus bloques A, B y C, para cada una de las 17 plantas
  (del sótano -5 a la planta 11), con los 195 servicios del directorio oficial y sus rangos de
  habitaciones.
- **Recinto**: huella georreferenciada del edificio principal, Urgencias, Pabellón Docente,
  Consultas Externas y apeadero de Cercanías, con el norte arriba y escala gráfica.

Incluye buscador de servicios y de números de habitación, selector de planta, panel de detalle por
bloque, zoom y arrastre, y descarga del mapa actual como SVG para reutilizarlo.

Los datos salen de los planos que el propio hospital publica en su Guía del paciente y de las
memorias anuales del centro. El análisis de qué planos existen, cuáles no están publicados y por qué
cauce se pueden solicitar está en **[`docs/planos-y-fuentes.md`](docs/planos-y-fuentes.md)**.

## Poner en marcha

No hay dependencias ni compilación. Basta abrir `web/index.html` con doble clic, porque los datos
van empaquetados en `web/datos.js`.

Con servidor local, si prefieres recarga limpia y rutas absolutas:

```bash
python3 -m http.server 8000 --directory web
# http://localhost:8000
```

## Estructura

```
data/
  hospital.json       Metadatos del centro, zonas, plantas, circulaciones, anexos
                      y parámetros geométricos del esquema de planta
  directorio.json     Directorio de servicios: zona → planta → [bloque, servicio, habitaciones]
  recinto.geojson     Geometría del recinto (OpenStreetMap), con coordenadas WGS84
                      y su proyección en metros lista para dibujar
scripts/
  fetch_recinto.py              Regenera data/recinto.geojson desde la Overpass API
  build_web_data.mjs            Empaqueta data/ en web/datos.js (con --check para validar)
  descargar_planos_oficiales.sh Descarga a planos/ las imágenes de los planos oficiales
web/
  index.html, estilos.css, app.js, datos.js   Visor
docs/
  planos-y-fuentes.md           Dónde están los planos y cómo pedir los que no son públicos
```

## Tareas habituales

```bash
# Validar los datos y comprobar que web/datos.js está al día
node scripts/build_web_data.mjs --check

# Regenerar web/datos.js tras editar data/*.json
node scripts/build_web_data.mjs

# Volver a bajar la geometría del recinto de OpenStreetMap
python3 scripts/fetch_recinto.py

# Traer las imágenes de los planos oficiales para cotejar la transcripción
bash scripts/descargar_planos_oficiales.sh
```

`build_web_data.mjs` valida que cada entrada del directorio apunte a una planta, zona y bloque
existentes y que tenga servicio o rango de habitaciones, así que sirve como comprobación de datos
en cualquier automatización.

## Cómo está organizado el edificio

Entender esto es la mitad del mapa:

- El edificio principal tiene **18 plantas**: 12 en altura, la planta baja y 5 sótanos. El
  directorio oficial cubre 17 niveles, del sótano -5 a la planta 11.
- Cada planta se divide en **tres zonas** señalizadas por color: Izquierda (verde), Centro
  (amarillo) y Derecha (azul).
- Dentro de cada zona hay **tres bloques, A, B y C**, del frente al fondo del edificio. Los
  quirófanos y las UCI se concentran generalmente en los bloques C.
- Las tres zonas se comunican entre sí **por la parte anterior en todas las plantas**, y además
  **por la parte posterior solo del sótano -5 a la planta 2**. El visor dibuja ese segundo pasillo
  con trama discontinua en las plantas donde no existe.
- Los planos oficiales están dibujados **con el norte hacia abajo**, desde el punto de vista de
  quien entra por la fachada principal. Por eso la zona Izquierda es el ala este real y la Derecha
  el ala oeste real. La vista de plantas conserva esa orientación, que es la de la señalética; la
  vista de recinto usa el norte arriba.

## Precisión y límites

El esquema de planta **no es un plano de proyecto**: reproduce la topología (zonas, bloques,
pasillos de comunicación, alas laterales, fachada) y las proporciones del plano oficial, pero no
tiene cotas y no sirve para uso técnico. La geometría del recinto sí es georreferenciada, aunque en
OpenStreetMap el edificio principal está dibujado como una huella tosca que no recoge las alas en
abanico.

El nivel de confianza de cada dato está detallado en
[`docs/planos-y-fuentes.md`](docs/planos-y-fuentes.md#3-cómo-se-usan-estas-fuentes-en-este-repositorio).
El caso a tener en cuenta: la planta y la zona de cada servicio son transcripción literal del plano
oficial, pero la letra del bloque es una interpretación del orden de columnas del plano y hay
excepciones observables.

El directorio refleja los planos publicados por el hospital, con última revisión en la web de 2023.
Los servicios se reubican con las obras, así que conviene confirmar en el mostrador de Información
de la planta 0 antes de fiarse para algo importante.

## Fuentes y licencias

- Directorio de servicios, plano de emplazamiento y colores de señalética: **Hospital Universitario
  Ramón y Cajal, Servicio Madrileño de Salud, Comunidad de Madrid**
  ([Guía del paciente](https://www.comunidad.madrid/hospital/ramonycajal/guia-paciente/plano-general-situacion-0)).
- Descripción del edificio: memorias anuales del hospital
  ([2024](https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2026-01/memoria_2024_hu_ryc.pdf)).
- Geometría del recinto: **© colaboradores de OpenStreetMap**, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
  Cualquier redistribución de `data/recinto.geojson` o de mapas derivados debe mantener esa atribución.
- Código de este repositorio: MIT (ver [`LICENSE`](LICENSE)).

Las imágenes originales de los planos no se versionan aquí; se descargan con
`scripts/descargar_planos_oficiales.sh` a `planos/`, que está en `.gitignore`.
