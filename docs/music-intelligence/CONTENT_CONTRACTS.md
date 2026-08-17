# Contratos de contenido Music Intelligence M0

Este documento define los artefactos offline. Ninguno de ellos cambia por si solo
el gameplay v1. Los schemas autoritativos viven en `content/music/schemas/` y se
validan con `npm run test:music-contracts` sin Python ni acceso a red.

## Separacion de contenido

```text
fuente privada (WAV, stems, recibos)   fuera de Git/public
audio web comprimido                  public/assets/audio/
metadata lateral                      content/music/metadata/<trackId>.json
analisis offline                      content/music/analysis/<trackId>.json
beatmap definitivo                    public/assets/beatmaps/<trackId>/<difficulty>.json
schemas y ejemplos                    content/music/schemas + examples
```

`npm run build` ingiere MP3/OGG y sincroniza los artefactos. Cuando detecta una pista
Suno nueva, prepara el entorno Python con el lockfile, analiza el audio y genera su
Beatmap v2 automáticamente; con la bandeja vacía es idempotente y no vuelve a
analizar. El navegador y GitHub Pages nunca ejecutan Python.

## Track Metadata v1

La metadata mantiene identidad y decisiones humanas fuera del manifest publicado:

- `audioHash`: SHA-256 de los bytes exactos del audio web;
- `audioMode`: `loop` para el legado corto o `single` para canciones completas;
- `tempoHint`, `bpmOverride` y `beatOffsetOverride`: correcciones manuales, `null`
  mientras no se hayan medido;
- `suggestedSections`: limites READ/DRIVE/CLIMAX propuestos manualmente;
- `provenance`: tipo de fuente, proveedor, estado comercial y referencia privada.

Comandos:

```powershell
npm run music:metadata
npm run music:metadata -- --track neon-horizon-a2c6f4a232
npm run music:metadata -- --track neon-horizon-a2c6f4a232 --force
```

Sin `--force`, un archivo existente se preserva para no borrar BPM, secciones o
procedencia curados. `--force` reconstruye solo la metadata solicitada y debe usarse
conscientemente.

## Analysis v1

El analisis contiene evidencia musical, no decisiones jugables:

- BPM estimado, BPM resuelto, fuente de tempo y `beatOffset` con su fuente;
- `beats[]` absolutos, que tienen prioridad sobre reconstruir toda la pista por BPM;
- onsets con fuerza normalizada;
- energia `low/mid/high` y volumen, todos entre 0 y 1;
- hash del audio y version del analizador para reproducibilidad.

M3 fija inicialmente low en 20-250 Hz, mid en 250-2,000 Hz y high en
2,000-10,000 Hz. Las series se suavizan y normalizan por pista; representan energia
relativa, no stems ni identificacion fiable de instrumentos.

`analysisHash` en Beatmap v2 es el SHA-256 de los bytes UTF-8 exactos del
`analysis.json` usado para generarlo. `null` significa mapa manual sin analisis.

## Beatmap v2

Beatmap v2 guarda tiempo e intencion canonica:

- fases con limites variables `startTime/endTime`;
- eventos absolutos y ordenados;
- coordenadas `x/y` normalizadas entre 0 y 1;
- `start` es la cabeza y fija el juicio musical Perfect/Bien;
- `controls` dan forma a la curva sin ser acciones nuevas;
- `checkpoints` expresan progreso canonico ordenado;
- `end` es el destino semantico del drag;
- `generatorVersion`, `analysisHash` y `locked` permiten auditar/regenerar.

No se admiten píxeles, DPR, viewport, iframe ni ramas mouse/touch/pen. Touch puede
exigir trazar checkpoints y mouse puede usar asistencia direccional, pero ambos
resuelven el mismo evento, tiempo, juicio, score y vida.

## Versiones y reproduccion espacial

`src/content/music-contract-versions.json` es la unica fuente para:

- `spatialModelVersion = spatial-v3-hard-mouse-acquisition`;
- `interactionContractVersion = tap-drag-v1`.

Para reproducir una proyeccion se conserva:

```text
Beatmap v2 exacto + dificultad + perfil de entrada + variante de alcance
+ viewport seguro + spatialModelVersion + interactionContractVersion
```

Con esas entradas, `PlayfieldLayout`, `TravelBudget` y el proyector determinista
producen la misma geometria. Cambiar de viewport puede cambiar pixeles proyectados,
pero nunca tiempos, orden, tipo o cantidad de notas. Una version espacial nueva se
publica si cambia comparabilidad competitiva; nunca se corrige un mapa creando una
rama por dispositivo.

## Bloqueo y regeneracion

Los mapas nuevos declaran `locked: false`. Tras una partida humana completa y su
curacion se cambia a `locked: true`. `--force` solo puede regenerar documentos que
sean explicitamente automáticos y no estén bloqueados.

El legado sin `generated: true` se considera revisado y bloqueado por defecto. Por
eso los tres mapas de `coffee-in-the-driveway` no pueden sobrescribirse ni siquiera
con:

```powershell
npm run music:beatmaps -- --track coffee-in-the-driveway --force
```

## Evidencia comercial privada

Git solo guarda `trackId`, `audioHash`, proveedor y estado. Por cada pista activada
debe existir fuera del repositorio una carpeta o registro privado con:

- URL/ID del proveedor y fecha de creacion;
- plan activo y recibo/captura correspondiente;
- prompt, modelo y archivo fuente;
- confirmacion de que no se extendio contenido de terceros;
- referencia que vincule esos datos con `trackId` y `audioHash`.

Antes de publicar una candidata se cambia `commercialUseStatus` de
`evidence-required` a `verified` y se llena `privateEvidenceRef` con una referencia
no sensible, por ejemplo `private-ledger:suno/neon-horizon-a2c6f4a232`. Recibos,
correo, identidad de cuenta y URLs privadas nunca entran al bundle web.
