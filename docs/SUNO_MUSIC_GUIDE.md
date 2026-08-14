# Guia maestra de musica para SUPERFLOW

El analizador futuro se adaptara a BPM, duracion, energia y secciones, pero una
fuente ritmicamente clara siempre producira mejores beatmaps que una pista con
tempo flotante o golpes ambiguos.

## Prompt maestro

Sustituir los valores entre corchetes. No pedir artistas, canciones ni
franquicias existentes.

```text
Original instrumental music for a neon arcade rhythm game, [GENRE], [BPM] BPM,
steady 4/4 meter, around [DURATION] seconds. Gameplay-first arrangement with a
clear beat from the first 1-2 seconds, crisp kick, snare or clap transients,
distinct hi-hat subdivisions, controlled bass, and a stable tempo grid.

Three clearly differentiated energy sections with seamless musical transitions:
READ (clean and spacious groove, few layers), DRIVE (stronger percussion, added
syncopation and melodic motion), CLIMAX (highest energy, denser but still clearly
separated rhythmic accents). Use short fills to announce section changes without
silence, fake endings or resetting the groove.

Memorable original hook, strong rhythmic contrast, clean modern mix, punchy but
not over-compressed, bass must not mask kick transients. No vocals, no spoken
words, no copyrighted melody, no artist imitation, no long ambient intro, no long
fade-in, no tempo drift, no meter changes, no abrupt BPM changes, no excessive
reverb, no random silence, no early fake ending. Finish with a clear final hit and
a short natural tail.
```

## Valores iniciales recomendados

- Duracion: 105-135 segundos; piloto ideal de 115-125 segundos.
- BPM facil de analizar: 105-135.
- BPM intenso: 136-155, solo si la mezcla conserva golpes separados.
- READ: 25-30% de la pista.
- DRIVE: 35-40%.
- CLIMAX: 30-35%, incluido el cierre.
- Mantener 4/4 y BPM estable durante las primeras pruebas del pipeline.

## Variantes de genero

- neon synthwave with modern electronic drums;
- electro funk with tight bass and syncopated percussion;
- melodic drum and bass with clean half-time landmarks;
- futuristic house with bright arpeggios;
- cyber latin electronic with precise percussion and restrained fills;
- orchestral electronic hybrid with strong cinematic drums.

Evitar inicialmente ambient puro, rubato, jazz con tempo libre, percusion
demasiado humana, cambios frecuentes de compas y mezclas donde todos los
instrumentos atacan al mismo tiempo. No estan prohibidos para siempre, pero
requieren mayor curacion manual.

## Flujo por cancion

1. Generar durante una suscripcion Pro/Premier activa.
2. No extender ni remezclar material de otra persona ni una creacion iniciada en
   el plan gratuito.
3. Guardar fuera del repositorio evidencia privada: URL/ID de Suno, fecha, plan,
   prompt, modelo y recibo o captura de la suscripcion.
4. Descargar MP3 para la build. Conservar WAV solo como fuente privada de analisis
   o edicion; no publicarlo con el juego.
5. Descartar pistas con intro larga, silencios, falsos finales, tempo inestable o
   parecido evidente con una obra conocida.
6. Subir el MP3 a `public/assets/audio/agregadas suno/` y ejecutar `npm run build`.
   La ingestion lo renombra con ID/hash, lo reparte de forma pseudoaleatoria y
   estable entre las tres categorias de pago y lo registra como `candidate`.
7. No mover ni renombrar manualmente una candidata ya registrada. Su hash mantiene
   identidad aunque el titulo original sea `Untitled` o tenga sufijos como `(1)`.
8. Activarla solo cuando tenga metadata y Beatmap v2; hasta entonces no aparece en
   la playlist v1 ni se precarga en movil.
9. Probar y bloquear el beatmap definitivo; nunca publicar un mapa automatico sin
   una partida humana completa.

El registro `content/music/suno-candidates.json` no contiene recibos, cuenta ni
datos privados. La evidencia comercial se conserva fuera del repositorio.

## Criterio de aceptacion

- El pulso puede seguirse sin mirar la pantalla.
- READ, DRIVE y CLIMAX se distinguen al escucharlos.
- Los cambios de seccion no parecen reinicios.
- Kick, caja/clap y subdivisiones pueden separarse auditivamente.
- No hay silencios que parezcan fallos del juego.
- El final es inequivoco.
- La pista sigue siendo agradable aun sin gameplay.

## Derechos y procedencia

Suno indica que las canciones creadas mientras la cuenta esta en Pro o Premier
reciben derechos de uso comercial, sujeto a sus terminos. Contratar despues no
concede automaticamente derechos retroactivos a canciones del plan gratuito.
Los derechos comerciales tampoco garantizan copyright ni exclusividad. Cada
pista debe conservar evidencia de procedencia y evitar letras, audio o melodias
de terceros.
