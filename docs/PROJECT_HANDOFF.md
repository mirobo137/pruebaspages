# SUPERFLOW - contexto para continuar en otra PC

Documento canonico de estado y arquitectura. Leer primero junto con
`REMAINING_WORK.md`. Actualizado: 2026-08-17.

## Producto y estado

SUPERFLOW es un juego ritmico web PixiJS/TypeScript pensado para Poki y CrazyGames.
Comparte score, timing, vidas, FLOW, progreso y beatmap entre dispositivos; mouse,
touch y pen solo cambian proyeccion espacial y asistencia fisica.

Estado actual:

- 23 canciones visibles y 69 beatmaps.
- Las 24 canciones legacy de 30 segundos fueron retiradas; `miss.wav` se conserva.
- Las 23 canciones largas de Suno fueron reimportadas con nombres estables, categorias
  y precios deterministas.
- Las 23 pistas tienen Analysis v1 con onsets por banda y tres mapas M4/Beatmap v2;
  permanecen `locked: false` hasta prueba humana.
- PC y movil fueron aprobados por el usuario; calidad full/reduced/minimal funciona.
- CrazyGames y Poki estan implementados y probados con adaptadores simulados, pero
  faltan Preview Tool e Inspector oficiales.
- Esta sesion contiene cambios locales pendientes de commit; no se ha hecho push.

## Gameplay estable

- Tap y drag; touch sigue el trayecto y mouse usa asistencia direccional.
- Campo desktop centrado de 820x680, presupuesto de recorrido y adquisicion Hard v3.
- Easy/Medium/Hard comparten mapa canonico y difieren en densidad/timing/tolerancia.
- FLOW x2 persiste hasta Miss; SUPER FLOW x4 baja a FLOW con Bien y termina con Miss.
- Danger deriva de la ultima vida; derrota tiene revive/reintento/playlist/resultado.
- Progreso local v3 con checksum, respaldo, estrellas, records, monedas, skins y evento.

## Audio y Music Intelligence

- AudioManager separa musica, SFX procedurales y FFT; los efectos nunca alteran reloj.
- M3 extrae BPM, beats, onsets globales, onsets low/mid/high y energia offline con
  Python/librosa (`librosa-m3-bands-v2`).
- M4 fusiona bandas, genera motivos, riffs, sincopas, secciones, drags sostenidos y
  mapas anidados (`hybrid-analysis-m4-bands-v1`).
- M5 combina macro offline con FFT micro. El visualizador es modular mediante
  `src/game/effects/music-visualizers/MusicVisualizer.ts` y admite barras+linea,
  solo barras o ninguno desde el tema.
- M6 bloquea mapas aprobados en `content/music/approved-beatmaps.json` y verifica
  que regenerarlos produzca exactamente el mismo contenido.

## Alta automatica de canciones

Entrada unica:

```text
public/assets/audio/agregadas suno/
```

Copiar uno o varios MP3/OGG y ejecutar:

```powershell
npm run build
```

`scripts/sync-music-content.mjs` hace todo el proceso:

1. calcula SHA-256 y crea un ID estable con nombre legible generado;
2. mueve el audio a Economicas, Selectas o Premium con precio determinista;
3. crea metadata y conserva procedencia Suno;
4. ejecuta Analysis v1 solo para importaciones nuevas/pendientes automaticas;
5. infiere Lectura/Impulso/Climax;
6. genera Beatmap v2 M4 para Easy/Medium/Hard;
7. crea perfil visual musical;
8. regenera manifest y deja la pista visible.

Python solo es obligatorio cuando entra audio nuevo. En la primera importacion el
build crea `.venv` e instala automaticamente las versiones fijadas de librosa,
matplotlib y numpy; requiere Internet esa primera vez. Si falla, el build reintenta
en el siguiente intento y no publica un mapa parcial. Con bandeja vacia el pipeline
es idempotente y no analiza otra vez.

Los mapas nuevos quedan visibles pero desbloqueados técnicamente (`locked: false`).
Tras probar una pista para release:

```powershell
node scripts/lock-approved-beatmaps.mjs --track <track-id>
```

No guardar recibos, cuenta o evidencia privada en Git. Ver `SUNO_MUSIC_GUIDE.md`.

## Estructura esencial

```text
src/app/                       ciclo de escenas y servicios
src/scenes/                    portada, menu, juego, resultado, coleccion, evento
src/input/                     perfiles, playfield, recorrido y drag
src/audio/                     musica, SFX reactivos y FFT
src/content/                   catalogo, Beatmap v1/v2 y perfiles visuales
src/customization/             temas, coleccion y MI SKIN
src/platform/                  local, CrazyGames y Poki
src/analytics/                 telemetria neutral y sinks
scripts/                       generacion, validadores y pipeline musical
content/music/                 metadata, Analysis v1, contratos y aprobaciones
public/assets/                 audio, beatmaps, previews, SFX y visuales
```

## Invariantes que no deben romperse

- Calidad grafica/resolucion nunca cambia reglas, posiciones logicas ni perfil input.
- Existe un solo beatmap por dificultad, no versiones separadas PC/movil.
- FFT y feedback son presentacion; nunca alimentan score, timing, notas o FLOW.
- `content:sync` no sobrescribe mapas bloqueados.
- Cancelar/error de anuncio nunca entrega recompensa; cada premio se concede una vez.
- GitHub Pages no carga SDK publicitario real.
- Las candidatas automáticas pueden aparecer en el catálogo de pruebas, pero no deben
  bloquearse ni publicarse formalmente sin revisión humana y evidencia de licencia.

## Preparar otra PC

```powershell
npm ci
npm run build
npm test
npm run dev -- --host 0.0.0.0
```

`npm test` genera el manifest ignorado antes de validar, por lo que funciona también
en un clon limpio. `npm run build` ejecuta primero la sincronización completa.
Para canciones nuevas basta instalar Python 3. El primer build prepara `.venv`.
`SUPERFLOW_PYTHON` permite elegir otro ejecutable y
`SUPERFLOW_AUTO_INSTALL_AUDIO=0` desactiva la instalacion automatica en entornos
que exijan provisionar dependencias manualmente.

## Verificacion actual

- Suite completa: contratos, 23 pistas/69 mapas, input, render, anuncios, progreso,
  Music Intelligence y regresion multiplataforma.
- Presupuesto JS: chunk principal menor a 500 kB.
- Pipeline nuevo: `npm run test:music-pipeline`.
- Release musical: `npm run test:music-release`.

## Documentacion

- Planes activos: `MUSIC_INTERPRETATION_ROADMAP_2.md` para musica y
  `REMAINING_WORK.md` para release/plataformas.
- Guia de musica/licencias: `SUNO_MUSIC_GUIDE.md`.
- Evidencia especializada: `music-intelligence/` y `desktop-baselines/`.
- Planes y handoffs sustituidos: `archive/`; son historia, no instrucciones activas.
