# Linea base Music Intelligence M0

La medicion inicial corresponde a la revision estable posterior al perfil desktop
y anterior a Beatmap v2. Se actualiza al cerrar M0 con los comandos indicados.

## Contenido protegido

- 24 canciones v1 activas y gratuitas.
- 72 beatmaps v1: 69 automaticos y 3 revisados/bloqueados por politica.
- 23 canciones Suno completas en estado `candidate`.
- 47 archivos Track Metadata v1 enlazados al SHA-256 real del audio.
- Perfil espacial `spatial-v3-hard-mouse-acquisition`.
- Contrato de interaccion `tap-drag-v1`.

## Evidencia desktop/touch preservada

- Mouse Facil, Medio y Dificil completados fisicamente.
- Campo mouse aprobado de hasta 820x680.
- Drag mouse asistido al 84%, sin checkpoints obligatorios.
- Touch/pen conservan politica `trace` y geometria canonica.
- Progreso compartido; ranking futuro separado por perfil/version.

La evidencia detallada permanece en `DESKTOP_INPUT_PROFILE_PLAN.md` y
`SESSION_HANDOFF_2026-08-13.md`.

## Comandos de cierre

```powershell
npm run test:music-contracts
npm test
npm run build
```

La build no debe invocar Python ni modificar archivos de analisis. El manifest debe
seguir mostrando 24 pistas y los validadores deben seguir encontrando 72 mapas v1.

## Medidas antes de M0

- Chunk principal: 477.34 kB sin comprimir, 138.21 kB gzip.
- Artefacto `dist`: 69.95 MiB incluyendo candidatas de audio no precargadas.
- Suite multiplataforma: 8 viewports, 3 dificultades, mouse/touch/pen.

## Medidas despues de M0

- Chunk principal: 477.33 kB sin comprimir, 138.19 kB gzip.
- Diferencia del chunk principal: -0.01 kB; sin aumento de carga inicial.
- Catalogo: 24 canciones v1, 72 mapas v1 y 23 candidatas, sin cambios.
- Contratos: 3 schemas, 2 ejemplos y 47 metadata validadas por hash.
- `npm test`: codigo 0 en toda la matriz automatizada.
- `npm run build`: codigo 0, sin Python ni analisis de audio.
- Bundle budget: aprobado.
