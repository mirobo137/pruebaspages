# M5 - visuales musicales en tiempo real

## Estado

- Implementacion tecnica: completada y aprobada en PC/movil.
- Compuerta: cerrada con calibracion `high-v2`.
- Gameplay: aislado; FFT no modifica notas, reloj, input, score ni FLOW.

## Arquitectura

M5 combina dos escalas que nunca alimentan reglas jugables:

```text
Analysis v1 -> envolvente offline de 1 s -> intensidad macro
audio de la cancion -> FFT aislado -> low/mid/high normalizado -> detalle micro
macro x micro -> fondo, glow y particulas laterales sutiles
```

- Low `45-250 Hz`: pulsacion contenida del aro central.
- Mid `250-2000 Hz`: respiracion secundaria de nebulosas.
- High `2000-8000 Hz`: brillo y particulas pequeñas en los bordes.
- Volumen `45-8000 Hz`: glow global con alpha limitado.
- Un espectro logaritmico `60-10000 Hz` alimenta 24 barras y una linea en Full;
  Reduced conserva 16 barras y Minimal elimina el visualizador.
- El normalizador usa un promedio movil por banda para acercar canciones suaves e
  intensas sin amplificar silencio.
- El analizador recibe una rama exclusiva desde las fuentes musicales. Los tonos de
  acierto, miss, FLOW y SUPER FLOW no entran al FFT.

## Visualizador reemplazable

`RhythmBackground` no dibuja barras ni lineas. Consume el contrato
`MusicVisualizer`, cuya fabrica selecciona una implementacion a partir de
`background.musicVisualizer.style`. La implementacion M5 vive en
`src/game/effects/music-visualizers/SpectrumBarsMusicVisualizer.ts` y admite
`spectrum-bars-line`, `spectrum-bars` o `none`.

Esto permite reemplazar el visualizador o convertirlo despues en una ranura del
paquete de skins sin duplicar el fondo ni mezclar FFT con gameplay. Por ahora el
estilo forma parte del tema resuelto, pero no altera compras ni desbloqueos.

## Presupuesto grafico

| Calidad | Muestreo FFT | Particulas musicales |
|---|---:|---:|
| Full | 60 Hz | maximo aproximado 6/s |
| Reduced | 30 Hz | maximo aproximado 3/s |
| Minimal | desactivado | ninguna |

La calidad puede cambiar durante la partida por rendimiento adaptativo. Esto sólo
cambia muestreo/presentacion y no selecciona perfil de input ni modifica el mapa.

## Artefactos offline

```powershell
npm run music:visual-profiles
npm run test:music-visuals
```

El generador lee exclusivamente los seis `Analysis v1` versionados, no decodifica
audio ni requiere Python. Produce perfiles deterministas en
`public/assets/music-visuals/` y un indice para evitar solicitudes 404 en canciones
legacy. `content:sync` los mantiene actualizados.

## Comparacion fisica

- M5 activo: `http://127.0.0.1:5173/`
- Control sin FFT: `http://127.0.0.1:5173/?musicVisuals=off`

Durante una partida de desarrollo, la consola expone:

```js
JSON.stringify(window.__superflowMusicVisuals, null, 2)
```

`samples` debe aumentar y `spectrumPeak` debe superar cero mientras suena la musica.

Comprobar:

1. Low acompana el pulso sin cambiar el tamano/lectura de objetivos.
2. El glow nunca parece un Perfect, Miss, FLOW o cambio de fase.
3. Las particulas permanecen en bordes y no ocultan notas.
4. El climax se siente mas intenso que una seccion tranquila.
5. FPS y resultados son equivalentes con M5 activo/inactivo.
6. Minimal no ejecuta muestreo FFT ni crea particulas musicales.

La primera calibracion tecnica resulto demasiado tenue: multiplicaba macro y micro
con alphas/umbrales que hacian casi indistinguible el control `off`. La calibracion
`high-v2` usa una referencia comun de volumen para conservar la forma entre bandas,
ataque rapido, caida gradual y picos visuales esperados de 0.6-0.8. Eleva la ganancia
del espectro de fondo sin tocar objetivos ni reglas.
