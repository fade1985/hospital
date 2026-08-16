#!/usr/bin/env bash
# Descarga a planos/ las imagenes de los planos publicados por el hospital.
#
# No se versionan en el repositorio: son obra de la Comunidad de Madrid y aqui
# solo se referencian. Este script las trae para poder cotejar la transcripcion
# de data/directorio.json con el original.
#
# Uso: bash scripts/descargar_planos_oficiales.sh [directorio_destino]

set -euo pipefail

destino="${1:-planos}"
base_cm="https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05"
base_hrc="http://www.hrc.es/paciente/images"

mkdir -p "$destino"

descargar() {
  local url="$1" nombre="$2"
  printf '  %-34s ' "$nombre"
  if curl -fsSL --retry 3 --retry-delay 2 -o "$destino/$nombre" "$url"; then
    printf 'ok (%s)\n' "$(du -h "$destino/$nombre" | cut -f1)"
  else
    printf 'ERROR\n'
  fi
}

echo "Planos de la Guia del paciente (Comunidad de Madrid):"
descargar "$base_cm/Foto01.png" "situacion-urbana.png"
descargar "$base_cm/Foto02.jpg" "recinto-senaletica.jpg"
descargar "$base_cm/01.png" "zona-izquierda.png"
descargar "$base_cm/02.JPG" "zona-centro.jpg"
descargar "$base_cm/03.JPG" "zona-derecha.jpg"

echo "Sitio historico hrc.es:"
descargar "$base_hrc/VisitaVirtualgrd.jpg" "recinto-visita-virtual.jpg"
descargar "$base_hrc/Leyendasenal.jpg" "leyenda-senaletica.jpg"

cat > "$destino/FUENTES.txt" <<'EOF'
Imagenes descargadas por scripts/descargar_planos_oficiales.sh

situacion-urbana.png         https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/Foto01.png
recinto-senaletica.jpg       https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/Foto02.jpg
zona-izquierda.png           https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/01.png
zona-centro.jpg              https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/02.JPG
zona-derecha.jpg             https://www.comunidad.madrid/hospital/ramonycajal/sites/ramonycajal/files/2023-05/03.JPG
recinto-visita-virtual.jpg   http://www.hrc.es/paciente/images/VisitaVirtualgrd.jpg
leyenda-senaletica.jpg       http://www.hrc.es/paciente/images/Leyendasenal.jpg

Pagina de origen:
https://www.comunidad.madrid/hospital/ramonycajal/guia-paciente/plano-general-situacion-0
http://www.hrc.es/paciente/pac_visita_dos.htm

Titularidad: Hospital Universitario Ramon y Cajal - Servicio Madrileno de Salud,
Comunidad de Madrid. Uso aqui limitado a consulta y cotejo de la transcripcion.
EOF

echo "Listo. Ver $destino/FUENTES.txt"
