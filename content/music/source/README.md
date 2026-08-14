# Audio fuente privado

Esta carpeta documenta la separacion del audio fuente, pero no almacena WAV,
stems, recibos ni evidencia privada en Git. Conservar esos materiales en un
respaldo privado identificado por el mismo `trackId` de la metadata.

El juego publica exclusivamente el audio web comprimido ubicado en
`public/assets/audio/`. El analizador offline podra leer una ruta local indicada
por el operador, pero nunca dependera de ella durante build o gameplay.
