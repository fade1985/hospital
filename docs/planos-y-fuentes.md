# Planos del Hospital Universitario Ramón y Cajal: qué hay publicado y qué no

Resumen de la búsqueda de planos del hospital (Carretera de Colmenar Viejo km 9,100, Madrid),
con el detalle de qué se puede usar directamente para construir un mapa 2D y qué exige
solicitarlo por un cauce oficial.

Conclusión corta: **no existe ningún plano arquitectónico planta por planta publicado en abierto**.
Lo que sí hay, y es suficiente para un mapa 2D de orientación como el de este repositorio, son los
esquemas de zonas de la Guía del paciente (que dan el directorio completo de servicios por planta y
zona), el plano de emplazamiento del recinto y la geometría georreferenciada de OpenStreetMap.

---

## 1. Material público directamente utilizable

### 1.1 Plano general de situación (Guía del paciente del hospital)

Página: <https://www.comunidad.madrid/hospital/ramonycajal/guia-paciente/plano-general-situacion-0>

| Archivo | Contenido | Enlace directo |
| --- | --- | --- |
| `Foto01.png` | Situación urbana del hospital sobre cartografía, con paradas de autobús y accesos | [descargar](https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/Foto01.png) |
| `Foto02.jpg` | **Plano del recinto** con la huella de todos los edificios, numerados, y la leyenda de colores de la señalética por sectores | [descargar](https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/Foto02.jpg) |
| `01.png` | Esquema de la **zona Izquierda** (verde): huella del edificio con el sector resaltado + tabla de servicios de las 17 plantas en tres columnas | [descargar](https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/01.png) |
| `02.JPG` | Esquema de la **zona Centro** (amarillo) | [descargar](https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/02.JPG) |
| `03.JPG` | Esquema de la **zona Derecha** (azul) | [descargar](https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/03.JPG) |

Los tres esquemas de zonas son la fuente más valiosa: contienen el directorio completo
(planta × zona × columna → servicios y rangos de habitaciones) y una miniatura de la huella del
edificio con el sector resaltado, que permite reconstruir la forma en abanico de la planta tipo.
Están transcritos íntegramente en [`data/directorio.json`](../data/directorio.json).

Resolución: son imágenes pequeñas (510 px de ancho). No hay versión de mayor resolución publicada.
`scripts/descargar_planos_oficiales.sh` las descarga a `planos/` para consulta local.

### 1.2 Visita virtual del sitio web histórico

El antiguo sitio `hrc.es` sigue en línea y contiene un plano del recinto con puntos de vista
panorámicos como mapa de imagen:

- Página: <http://www.hrc.es/paciente/pac_visita_dos.htm>
- Plano: <http://www.hrc.es/paciente/images/VisitaVirtualgrd.jpg>
- Leyenda de señalética: <http://www.hrc.es/paciente/images/Leyendasenal.jpg>
- Boletín interno con información de obras y reformas: <http://www.hrc.es/pdf/periodico/>

Es el mismo plano de recinto que `Foto02.jpg`, algo más nítido, más las fotografías panorámicas
del hall, urgencias, quirófanos y habitaciones.

### 1.3 Memorias anuales del hospital

Describen el edificio en texto y son la fuente de la topología (plantas, zonas, bloques y
comunicaciones):

- Memoria 2024: <https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2026-01/memoria_2024_hu_ryc.pdf>
- Memoria 2019: <https://www.comunidad.madrid/hospital/ramonycajal/file/4991/download?token=Gi8s3Uo6>

Datos clave que aportan:

- El edificio principal tiene 18 plantas: 12 en altura, la planta baja y 5 sótanos.
- Cada planta se organiza en tres zonas (Derecha, Centro e Izquierda), comunicadas entre sí **por la
  parte anterior** en todas las plantas.
- Existe además comunicación **por la parte posterior desde el sótano -5 hasta la planta 2**.
- Dentro de cada zona hay tres subzonas A, B y C, que pueden alojar controles de enfermería.
  Las UCI y los quirófanos se sitúan generalmente en los controles C, al fondo del edificio.
- Edificios anexos conectados por túneles o espacios abiertos: Resonancia Magnética (parte
  posterior), Consultas Externas y Pabellón Docente (a la derecha de la fachada principal),
  apeadero de Renfe (enfrente), central telefónica y sala de máquinas (a la izquierda), Urgencias.
- Superficie: 249.706 m².

### 1.4 Geometría georreferenciada (OpenStreetMap)

- Edificio principal: <https://www.openstreetmap.org/relation/13037178>
- Recinto: <https://www.openstreetmap.org/way/394889262>
- Pabellón Docente: <https://www.openstreetmap.org/way/968812172>
- Apeadero de Cercanías Ramón y Cajal: <https://www.openstreetmap.org/way/14665984>

`scripts/fetch_recinto.py` descarga esta geometría vía Overpass API y la deja proyectada en metros
en [`data/recinto.geojson`](../data/recinto.geojson).

Limitación importante: en OpenStreetMap el edificio principal está dibujado como una única huella
tosca (≈245 × 154 m) con dos patios interiores. **No refleja las alas en abanico** que sí se ven en
los planos oficiales, así que sirve para la vista de recinto pero no para deducir la planta.
Mejorar ese contorno en OSM sería, de hecho, la forma más útil de que este mapa gane precisión.

### 1.5 Ficha del edificio y bibliografía del proyecto original

- Guía de arquitectura de Madrid (Fundación COAM), ficha L3.028 "Centro Nacional de Especialidades
  Quirúrgicas Ramón y Cajal": <https://fcoam.eu/guia/L3/L3.28.htm>
  - Proyecto: Martín José Marcide Odriozola (1972-1973).
  - Obra: Rafael de Aburto Renobales, Federico del Cerro Espinós y Fernando Flórez Plaza (1972-1976).
- **Publicación con los planos originales**: «Centro Ramón y Cajal. Edificio asistencial
  médico-quirúrgico de la Seguridad Social», *TA. Temas de Arquitectura y Urbanismo*, nº 210,
  febrero de 1977, págs. I-XII. Ficha: <https://fcoam.eu/guia/bibrev/bibrev.0573.htm>

Esa revista de 1977 es, con mucha probabilidad, la vía más rápida para ver plantas dibujadas del
proyecto original. Se consulta en la hemeroteca de la Biblioteca del COAM.

### 1.6 Contratación pública

El perfil de contratante publica los proyectos de obra, que incluyen planos como anexos:

- Portal: <https://contratos-publicos.comunidad.madrid/>
- Expediente ST2024-0-01, «Obras de rehabilitación de las fachadas del Hospital Universitario
  Ramón y Cajal» (PIREP / Next Generation EU, 15.885.325,55 € con IVA):
  <https://contratos-publicos.comunidad.madrid/contrato-publico/print/pdf/node/281514>
  El apartado «Proyecto de obras» es descargable y contiene documentación gráfica de **fachadas** y
  de la envolvente del edificio principal, del edificio del apeadero y de Consultas Externas.

Merece la pena revisar periódicamente el portal filtrando por el hospital: cada reforma interior
que se licita publica sus propios planos de estado actual y reformado de las plantas afectadas.
Es la vía pública más productiva para obtener plantas reales, aunque sea troceadas.

### 1.7 Catastro

La Sede Electrónica del Catastro ofrece la consulta descriptiva y gráfica del inmueble, con la
geometría de la parcela y la superficie construida por planta:
<https://www.sedecatastro.gob.es/>

No publica el reparto interior de estancias, pero la geometría de la parcela y la huella catastral
son más precisas que las de OpenStreetMap.

---

## 2. Lo que no está publicado, y cómo pedirlo

Los planos arquitectónicos completos (plantas, secciones, instalaciones, plan de autoprotección)
no están en abierto. Vías razonables, de más a menos directa:

1. **Servicio de Ingeniería y Mantenimiento del propio hospital.** Es quien custodia el juego de
   planos actualizado. Para un trabajo académico o un proyecto de señalización o accesibilidad, una
   petición motivada por escrito a la Dirección de Gestión suele ser el camino más corto.
2. **Portal de Transparencia de la Comunidad de Madrid**, solicitud de acceso a información
   pública al amparo de la Ley 19/2013 y de la Ley 10/2019 de Transparencia de la Comunidad de
   Madrid: <https://www.comunidad.madrid/transparencia>
   Ten en cuenta que la Administración puede limitar o denegar parcialmente el acceso a planos
   detallados de un hospital invocando la seguridad pública (art. 14.1 LTAIBG); es habitual que se
   entreguen plantas de distribución pero no planos de instalaciones críticas.
3. **Fundación Arquitectura COAM**, archivo y biblioteca: fondo de Rafael de Aburto Renobales y
   hemeroteca con la revista *TA* nº 210 de 1977. <https://www.fundacionarquitecturacoam.es/>
4. **Archivo General de la Administración (AGA, Alcalá de Henares)** y **Archivo Regional de la
   Comunidad de Madrid**: el promotor original fue el Instituto Nacional de Previsión, cuyo fondo
   documental incluye los proyectos de los grandes hospitales de la Seguridad Social.
5. **Colegio Oficial de Arquitectos**: los visados de las reformas posteriores permiten identificar
   a los estudios que las firmaron (por ejemplo Luis González Esterling en las reformas del Plan
   Director de los años 2000, citado en el boletín interno del hospital).

Advertencia sensata: los planos detallados de un hospital son información sensible. Este
repositorio se queda a propósito en el nivel de detalle de la señalética pública, que es lo que se
necesita para orientarse y lo que el hospital ya publica.

---

## 3. Cómo se usan estas fuentes en este repositorio

| Dato | Fuente | Confianza |
| --- | --- | --- |
| Servicios por planta y zona | Esquemas 01/02/03 de la Guía del paciente | **Alta**, transcripción literal |
| Rangos de habitaciones | Los mismos esquemas | **Alta** |
| Bloque A/B/C de cada servicio | Orden de columnas de los esquemas + descripción de las memorias | **Media**, ver nota abajo |
| Número y tipo de plantas | Memoria 2024 | Alta |
| Comunicación anterior y posterior | Memoria 2024 | Alta |
| Colores de señalética por sector | Leyenda de `Foto02.jpg` | Alta |
| Huella del recinto y de los anexos | OpenStreetMap | Alta en posición, media en detalle |
| Forma en abanico de la planta tipo | Miniaturas de los esquemas y `Foto02.jpg` | **Esquemática**: se reproducen topología y proporciones, no cotas |
| Orientación (norte hacia abajo en el plano oficial) | Deducción contrastando el plano oficial con OSM | Media-alta, ver abajo |

### Nota sobre los bloques A, B y C

Cada esquema de zona dispone los servicios de cada planta en tres columnas, pero no las rotula. El
hospital describe por su parte que dentro de cada zona existen tres subzonas A, B y C y que las UCI
y los quirófanos están «generalmente» en los controles C, al fondo del edificio. Se ha asociado la
columna 1 al bloque A (frente), la 2 al B y la 3 al C (fondo), lo que encaja con varios casos
comprobables (Quirófanos O.R.L. y Quirófanos de Cirugía Torácica en la columna 3, UVI de Cirugía
Abdominal en la columna 3), pero no con todos (la UCI Médica de la zona Derecha aparece en la
columna 1). Por eso el bloque se marca como orientativo tanto en los datos como en la interfaz.

### Nota sobre la orientación

Los planos oficiales están dibujados desde el punto de vista de quien llega a la fachada
principal, con el norte hacia abajo. Se deduce contrastándolos con las posiciones reales de
OpenStreetMap:

- El apeadero de Cercanías aparece **debajo** del edificio en el plano oficial y está al **norte**
  en la realidad.
- El Pabellón Docente aparece **abajo a la derecha** en el plano oficial y está al **noroeste** en
  la realidad, lo que además coincide con la descripción de las memorias, que lo sitúan «a la
  derecha de la fachada principal».

Consecuencia práctica: la zona **Izquierda** (verde) es el ala **este** real y la zona **Derecha**
(azul) es el ala **oeste** real. La vista de plantas del visor mantiene la orientación oficial
porque es la que coincide con la señalética que ve el paciente; la vista de recinto usa el norte
arriba.
