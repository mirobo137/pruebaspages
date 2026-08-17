# Sesion 2026-08-17 - Musical v2 como version oficial

## Resultado de esta sesion

La interpretacion `hybrid-analysis-m4-musical-v2` deja de ser solo un preview y
queda como la version principal de los beatmaps.

- 23 canciones Suno revisadas en el pipeline.
- 69 mapas oficiales reemplazados: 23 canciones x Easy/Medium/Hard.
- Todos los mapas oficiales quedaron con `locked: true`.
- `content/music/approved-beatmaps.json` fue actualizado con la version y hashes
  nuevos.
- Los previews `public/assets/beatmap-previews/m4-v2/` se conservan como referencia
  de prueba.
- La interpretacion v1 de bandas permanece disponible como referencia historica.
- La v3 con chroma/melodias sigue aislada y no modifica el juego oficial.

## Que aporta Musical v2

- Fusiona beats, onsets globales y onsets `low`, `mid` y `high`.
- Clasifica heuristicas de kick, snare, hi-hat y ataques melodicos.
- Da mas peso a riffs y varia sus patrones espaciales.
- Reduce repeticiones consecutivas de posicion.
- Mantiene Easy como subconjunto de Medium y Medium como subconjunto de Hard.
- Conserva descansos de drags y las restricciones de touch/mouse.

## Cambios de automatizacion

Las canciones nuevas que entren por `public/assets/audio/agregadas suno/` ya generan
sus mapas con Musical v2 durante `npm run build`. Tambien `approve-music-track.mjs`
y `verify-music-release.mjs` usan la misma version para que la aprobacion y la
verificacion no vuelvan a generar mapas v1.

El comando nuevo para promover un lote v2 previamente probado es:

```powershell
npm run music:hybrid-batch -- --all-analyzed --interpretation-v2
npm run music:promote-v2
```

No se debe ejecutar `music:promote-v2` hasta probar el preview en el movil.

## Pruebas realizadas aqui

- Preview v2 generado para las 23 canciones.
- Piloto probado en GitHub Pages desde movil.
- `npm run test:music-hybrid` aprobado.
- `npm run test:music-ingest` aprobado.
- `npm run build` aprobado antes de la promocion.
- La promocion verifico identidad de pista, hash de audio/analisis, dificultades,
  contrato Beatmap v2 y version del generador antes de escribir los mapas oficiales.

## Verificacion pendiente en casa

Desde la PC de casa, despues de hacer pull, ejecutar:

```powershell
npm ci
npm run build
npm test
npm run dev -- --host 0.0.0.0
```

Abrir en el movil la URL local que muestre Vite. Probar al menos una cancion en las
tres dificultades y confirmar que el mapa oficial ya se siente igual que el preview.
Para comparar de nuevo contra el preview v2:

```text
http://IP_DE_LA_PC:5173/?beatmapPreview=m4-v2&previewTrack=hollow-motif-0f61f35777
```

La version oficial normal no necesita parametros. En GitHub Pages se prueba con la
URL publicada sin `beatmapPreview`.

## Siguiente decision

Si la prueba de casa confirma Musical v2, no quedan cambios tecnicos obligatorios en
la interpretacion de beatmaps. Solo queda curacion editorial pista por pista: ajustar
un `beatOffsetOverride` o secciones en metadata si alguna cancion lo necesita.

La v3 de chroma requiere una PC con Python 3 y dependencias de audio. Es una mejora
opcional para dar mas identidad melodica; no debe mezclarse con la version oficial
hasta generar sidecars, probarla en movil y aprobarla expresamente.

## Git

Esta sesion deja cambios locales listos, pero no hace `commit` ni `push`. En casa,
revisar `git status`, probar y despues publicar el commit cuando todo este confirmado.
