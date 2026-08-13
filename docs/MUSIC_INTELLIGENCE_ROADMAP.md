# Hoja de ruta Music Intelligence

Este plan evoluciona SUPERFLOW desde loops de 30 segundos y patrones temporales
fijos hacia canciones completas con beatmaps determinados por la musica. Es un
ciclo posterior e independiente de la hoja de skins, eventos, anuncios,
multiplataforma y lanzamiento, que concluye en sus Fases 12 y 13.

## Estado

- Estado general: `NO INICIADO`
- Fase activa: `Ninguna`
- Siguiente accion: `Concluir Fases 12 y 13 del plan actual y aprobar el juego completo`
- Implementacion: una fase por vez; ninguna fase siguiente comienza sin aprobar
  la compuerta de la anterior.

## Condiciones de entrada

Antes de M0:

- completar la implementacion tecnica de las Fases 12 y 13; sus validaciones de
  portal y datos reales permanecen como compuertas de publicacion en la hoja original;
- completar despues la prueba integral acumulada mediante
  [`PHASE_11_5_VALIDATION_CHECKLIST.md`](PHASE_11_5_VALIDATION_CHECKLIST.md)
  en al menos un movil y un PC;
- corregir las regresiones demostradas por esa validacion;
- ejecutar `npm test` y `npm run build`;
- guardar una revision estable que permita comparar el sistema anterior;
- verificar las condiciones comerciales de la suscripcion usada para cada pista
  de IA y conservar evidencia privada de proveedor, plan y fecha de creacion.

La prueba integral del usuario y las compuertas de portal del plan actual no se
trasladan a esta hoja. Tras aprobar el juego completo en PC y movil, M0 puede
comenzar aunque Preview, Inspector o una muestra real sigan pendientes; esos
pendientes continúan bloqueando publicacion, no el desarrollo musical.

## Principios no negociables

- El analisis ocurre offline; el movil nunca genera beatmaps.
- Todos los jugadores reciben el mismo JSON definitivo.
- Ningun mapa exige multitouch y todo mapa es completable con un mouse.
- `beats[]` detectados prevalecen sobre reconstruir toda la cancion con BPM.
- BPM y beatOffset sirven para cuantizar, reparar y actuar como fallback.
- Los patrones determinan el movimiento; el audio determina oportunidades de tiempo.
- Los mapas actuales de 30 segundos siguen funcionando durante la migracion.
- Easy conserva los acentos de Medium y Medium los de Hard siempre que sea musical:
  `Easy ⊂ Medium ⊂ Hard`.
- No se sobrescribe silenciosamente un beatmap revisado a mano.
- WAV de produccion no se publica como canción completa: el juego recibe audio
  comprimido; WAV queda fuera de `public` salvo efectos breves como `miss.wav`.

## Arquitectura objetivo

```text
audio fuente + metadata manual
             ↓
analizador offline Python
             ↓
analysis.json (beats, onsets, energia)
             ↓
generador hibrido determinista
             ↓
easy / medium / hard JSON versionados
             ↓
validador de jugabilidad
             ↓
audio comprimido + beatmaps → juego

durante la partida:
beatmap JSON → reglas y timing
FFT Web Audio → microefectos visuales exclusivamente
```

## M0 - Contratos, contenido y linea base

Objetivo: definir formatos y proteger el juego existente antes de cambiar playback.

- [ ] M0.1 Documentar Beatmap v2, Analysis v1 y metadata lateral con schemas claros.
- [ ] M0.2 Separar audio fuente, audio web, analisis, metadata y beatmaps definitivos.
- [ ] M0.3 Añadir metadata por `trackId`: BPM/offset overrides, modo de audio,
  secciones sugeridas y procedencia/licencia sin publicar documentos privados.
- [ ] M0.4 Añadir `generatorVersion`, hash del analisis y bandera `locked`.
- [ ] M0.5 Crear comandos por cancion y `--force`; un mapa `locked` nunca se pisa.
- [ ] M0.6 Medir build estable: tamaño, carga inicial, tests, 24 canciones y 72 mapas.

Compuerta M0:

- los formatos son validados automáticamente;
- `npm run build` no analiza audio ni requiere Python;
- no cambia el comportamiento de ninguna canción existente;
- está definido cómo demostrar derechos comerciales de cada canción sin guardar
  información sensible dentro del bundle web.

## M1 - Beatmap v2 y canciones completas

Objetivo: reproducir una canción completa una sola vez, con fases de duración variable.

- [ ] M1.1 Cargar Beatmap v1 y v2 mediante adaptadores separados.
- [ ] M1.2 Añadir `duration`, `audioMode: single|loop` y fases con `startTime/endTime`.
- [ ] M1.3 Reemplazar cálculo de fase por división uniforme con búsqueda por límites.
- [ ] M1.4 Reproducir `single` sin loop, crossfade ni cambio de `playbackRate`.
- [ ] M1.5 Mantener revive/seek, transiciones seguras, resultado y derrota.
- [ ] M1.6 Crear una canción piloto completa de 90-120 segundos con mapa manual mínimo.

Compuerta M1:

- los loops v1 siguen sonando y jugando igual;
- la canción piloto termina exactamente con su audio y no se repite ni estira;
- Lectura, Impulso y Climax pueden tener longitudes distintas;
- pausa, revive y derrota conservan sincronización.

## M2 - Metadata BPM y dificultad musical

Objetivo: abandonar los intervalos globales sin depender todavía del analizador.

- [ ] M2.1 Consumir BPM, beatOffset y overrides desde metadata.
- [ ] M2.2 Calcular negras, corcheas y semicorcheas por canción como fallback.
- [ ] M2.3 Crear presupuestos de densidad, distancia/tiempo, giro y drag por dificultad.
- [ ] M2.4 Prohibir simultaneidad obligatoria y validar separación mínima por tipo de nota.
- [ ] M2.5 Hacer Easy subconjunto estructural de Medium y Hard.
- [ ] M2.6 Garantizar semilla determinista y cero posiciones aleatorias en mapas finales.

Separaciones iniciales para calibrar, no contratos definitivos:

| Dificultad | Tap siguiente | Después de drag |
|---|---:|---:|
| Fácil | 450-600 ms | mayor que ventana completa del drag |
| Medio | 260-380 ms | mayor que ventana completa del drag |
| Difícil | 160-240 ms | mayor que ventana completa del drag |

Compuerta M2:

- canciones de 90, 105, 120, 128, 140 y 174 BPM pueden producir mapas válidos;
- ningún mapa depende de dos acciones simultáneas;
- mouse y touch completan las mismas notas con perfiles espaciales propios;
- 70-100 ms permanece fuera hasta una fase futura con pruebas específicas.

## M3 - Analizador offline

Objetivo: producir evidencia musical útil y corregible, no reconocimiento perfecto.

- [ ] M3.1 Crear `tools/audio-analysis/analyze_song.py` con `librosa` y `numpy`.
- [ ] M3.2 Extraer duración, BPM estimado, beatOffset, beats, onsets y strength.
- [ ] M3.3 Calcular energía normalizada low/mid/high por rangos de Hz documentados.
- [ ] M3.4 Aceptar `tempoHint`, BPM/offset overrides y resolver ambigüedad mitad/doble.
- [ ] M3.5 Soportar archivo individual, carpeta, caché por hash y `--force`.
- [ ] M3.6 En `--debug`, generar waveform con beats/onsets y resumen de consola.
- [ ] M3.7 Versionar `analysis.json`; el resultado se guarda en Git y build solo valida.

Compuerta M3:

- repetir análisis sin cambiar entrada produce el mismo JSON útil;
- el gráfico coincide razonablemente con al menos seis canciones distintas;
- DnB 174/87 y canciones con introducción pueden corregirse sin modificar Python;
- un fallo de análisis explica el archivo afectado y no destruye resultados previos.

## M4 - Generador híbrido de beatmaps

Objetivo: usar la música para el cuándo y los patrones para el cómo.

- [ ] M4.1 Fusionar beats y onsets en candidatos, eliminando duplicados cercanos.
- [ ] M4.2 Calcular intensidad local y segmentos tranquilos, buildup, pico y break sin
  afirmar reconocimiento perfecto de drops.
- [ ] M4.3 Seleccionar candidatos por dificultad y presupuesto de densidad.
- [ ] M4.4 Evolucionar patrones actuales en motivos, inversiones y call/response.
- [ ] M4.5 Mapear low a acentos, mid a dirección y high a detalle opcional en Hard.
- [ ] M4.6 Generar drags por contexto/espacio; no inferir sustain científico todavía.
- [ ] M4.7 Crear validador de ventanas solapadas, velocidad espacial, bordes, drag y fases.
- [ ] M4.8 Permitir generación por pista, dificultad, preview y diff antes de sobrescribir.

Compuerta M4:

- los mapas siguen golpes y cambios de intensidad mejor que la cuadrícula anterior;
- no convierten cada onset en una nota;
- partes tranquilas respiran y clímax aumenta reto sin volverse imposible;
- los JSON son legibles, reproducibles, editables y bloqueables.

## M5 - Visuales FFT en tiempo real

Objetivo: añadir microreacción visual sin permitir que el FFT afecte reglas.

- [ ] M5.1 Cambiar bandas porcentuales por rangos aproximados en Hz.
- [ ] M5.2 Normalizar contra promedio móvil para comparar canciones suaves/intensas.
- [ ] M5.3 Usar low para pulsación, volumen para glow y high para partículas sutiles.
- [ ] M5.4 Combinar intensidad offline macro con FFT micro, sin flashes duplicados.
- [ ] M5.5 Reducir muestras/efectos bajo el perfil visual reducido.

Compuerta M5:

- desactivar FFT no cambia notas, score, timing ni resultados;
- no existe caída significativa de FPS en el móvil objetivo;
- visuales acompañan la música sin ocultar objetivos ni competir con Danger/FLOW.

## M6 - Curación, automatización y salida

Objetivo: convertir el pipeline en el flujo normal para mantener contenido.

- [ ] M6.1 Curar al menos seis canciones completas y tres dificultades por canción.
- [ ] M6.2 Comparar BPM/estilos distintos y registrar correcciones de reglas.
- [ ] M6.3 Bloquear mapas aprobados y demostrar que regenerar no los altera.
- [ ] M6.4 Documentar desde descarga de Suno/Mureka hasta push y GitHub Pages.
- [ ] M6.5 Validar peso web, memoria, precarga, primer inicio y cambio de canción.
- [ ] M6.6 Probar PC, móvil, GitHub Pages y portal objetivo.
- [ ] M6.7 Decidir con evidencia si hace falta un editor visual sencillo.

Compuerta M6:

- añadir una canción nueva es un proceso repetible y con validaciones claras;
- cada dificultad se siente musicalmente relacionada y sustancialmente diferente;
- rankings pueden comparar jugadores sobre mapas definitivos;
- no se necesita Python, WAV fuente ni análisis durante la partida o deployment;
- solo se propone editor si la corrección manual recurrente justifica su coste.

## Fuera de alcance M0-M6

- machine learning entrenado;
- separación de stems;
- identificación fiable de instrumentos;
- editor tipo DAW;
- análisis de gameplay en tiempo real;
- multitouch obligatorio;
- cambios de BPM dentro de una canción en la primera versión;
- pseudoacordes de 70-100 ms sin una fase futura específica;
- objetivos hold o nuevos tipos de nota antes de estabilizar tap/drag musicales.

## Prueba piloto recomendada

La primera pista completa debe ser instrumental, 4/4, tempo constante, percusión
clara, inicio corto y final definido. Se probará primero con metadata manual en M1/M2;
el analizador M3 no debe ser requisito para demostrar playback y Beatmap v2.

## Registro de ejecución

| Fecha | Fase | Estado | Evidencia |
|---|---|---|---|
| 2026-08-13 | Planificación | No iniciado | Arquitectura y compuertas M0-M6 definidas; espera aceptación física 11.5G |
