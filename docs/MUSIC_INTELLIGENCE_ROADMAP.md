# Hoja de ruta Music Intelligence

Este plan evoluciona SUPERFLOW desde loops de 30 segundos y patrones temporales
fijos hacia canciones completas con beatmaps determinados por la musica. Es un
ciclo posterior e independiente de la hoja de skins, eventos, anuncios,
multiplataforma y lanzamiento, que concluye en sus Fases 12 y 13.

La ergonomia multiplataforma que habilita este ciclo vive en
[`DESKTOP_INPUT_PROFILE_PLAN.md`](DESKTOP_INPUT_PROFILE_PLAN.md). Music Intelligence
consume sus perfiles y validadores; no vuelve a implementar input ni genera un mapa
distinto para cada dispositivo.

## Estado

- Estado general: `EN EJECUCION`
- Fase activa: `M1 IMPLEMENTADA / VALIDACION FISICA PENDIENTE`
- Preparacion: `Ingestion Suno, auditoria mouse y contratos offline completados sin cambiar gameplay`
- Siguiente accion: `Probar Suno Pilot 01 completa en mouse y touch; no iniciar M2 antes de aprobarla`
- Implementacion: una fase por vez; ninguna fase siguiente comienza sin aprobar
  la compuerta de la anterior.

## Condiciones de entrada

Antes de M0:

- completar la implementacion tecnica de las Fases 12 y 13; sus validaciones de
  portal y datos reales permanecen como compuertas de publicacion en la hoja original;
- completar D0-D7 de [`DESKTOP_INPUT_PROFILE_PLAN.md`](DESKTOP_INPUT_PROFILE_PLAN.md),
  incluida la separacion entre dificultad ritmica y ergonomia de entrada;
- completar la prueba integral acumulada mediante
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
- El JSON guarda tiempo e intencion espacial canonica normalizada; nunca pixeles,
  DPR, tamaño de iframe ni una variante `desktop/mobile`.
- La proyeccion espacial ocurre mediante perfiles versionados y deterministas. Un
  mismo mapa puede producir geometria ergonomica diferente sin cambiar sus notas.
- Tiempo, orden, tipo de nota, ventanas, vidas, score y FLOW son compartidos. Solo
  pueden variar campo, alcance, asistencia fisica, recorrido y contrato del drag.
- El juicio `Perfect/Bien` de un drag se fija en su cabeza. Touch y mouse pueden
  completar fisicamente el gesto de forma distinta sin crear un tipo de nota nuevo.
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
beatmap JSON canonico → reglas y timing compartidos
                      → proyector espacial + perfil activo → geometria jugable
FFT Web Audio → microefectos visuales exclusivamente
```

## M0 - Contratos, contenido y linea base

Objetivo: definir formatos y proteger el juego existente antes de cambiar playback.

- [x] M0.1 Documentar Beatmap v2, Analysis v1 y metadata lateral con schemas claros.
- [x] M0.2 Separar audio fuente, audio web, analisis, metadata y beatmaps definitivos.
- [x] M0.3 Añadir metadata por `trackId`: BPM/offset overrides, modo de audio,
  secciones sugeridas y procedencia/licencia sin publicar documentos privados.
- [x] M0.4 Añadir `generatorVersion`, hash del analisis y bandera `locked`.
- [x] M0.5 Definir coordenadas como intencion canonica normalizada y documentar
  cabeza, controles, checkpoints y destino del `drag` sin semantica por dispositivo.
- [x] M0.6 Añadir `spatialModelVersion` y `interactionContractVersion` al contexto
  reproducible sin acoplar el JSON a valores runtime de un perfil.
  `spatialModelVersion` ya nace en D6 y actualmente usa
  `spatial-v3-hard-mouse-acquisition`; M0 solo
  debe incorporarlo al artefacto musical junto con `interactionContractVersion`.
- [x] M0.7 Crear comandos por cancion y `--force`; un mapa `locked` nunca se pisa.
- [x] M0.8 Medir build estable: tamaño, carga inicial, tests, 24 canciones y 72 mapas,
  incluyendo resultados de la linea base mouse/touch aprobada en D7.

Compuerta M0:

- los formatos son validados automáticamente;
- `npm run build` no analiza audio ni requiere Python;
- no cambia el comportamiento de ninguna canción existente;
- un schema rechaza pixeles, ramas por dispositivo y contratos de drag ambiguos;
- esta definido como reproducir una proyeccion con mapa, perfil y versiones dadas;
- está definido cómo demostrar derechos comerciales de cada canción sin guardar
  información sensible dentro del bundle web.

## M1 - Beatmap v2 y canciones completas

Objetivo: reproducir una canción completa una sola vez, con fases de duración variable.

- [x] M1.1 Cargar Beatmap v1 y v2 mediante adaptadores separados.
- [x] M1.2 Añadir `duration`, `audioMode: single|loop` y fases con `startTime/endTime`.
- [x] M1.3 Reemplazar cálculo de fase por división uniforme con búsqueda por límites.
- [x] M1.4 Reproducir `single` sin loop, crossfade ni cambio de `playbackRate`.
- [x] M1.5 Mantener revive/seek, transiciones seguras, resultado y derrota.
- [x] M1.6 Crear una canción piloto completa de 124.872 segundos con mapa técnico mínimo;
  se acepta la desviacion de 4.872 s porque ninguna candidata existente cae en 90-120 s.
- [~] M1.7 Proyectar la cancion piloto con mouse, touch y pen usando el mismo Beatmap v2;
  validacion automatica aprobada, partidas fisicas pendientes.

Compuerta M1:

- los loops v1 siguen sonando y jugando igual;
- la canción piloto termina exactamente con su audio y no se repite ni estira;
- Lectura, Impulso y Climax pueden tener longitudes distintas;
- pausa, revive y derrota conservan sincronización;
- resize, fullscreen o cambio de perfil entre notas no alteran el reloj musical.

## M2 - Metadata BPM y dificultad musical

Objetivo: abandonar los intervalos globales sin depender todavía del analizador.

- [ ] M2.1 Consumir BPM, beatOffset y overrides desde metadata.
- [ ] M2.2 Calcular negras, corcheas y semicorcheas por canción como fallback.
- [ ] M2.3 Crear presupuestos canonicos de densidad, distancia/tiempo, giro y drag
  por dificultad, consumiendo `TravelBudget` en vez de duplicar sus formulas.
- [ ] M2.4 Prohibir simultaneidad obligatoria y validar separación mínima por tipo de nota.
- [ ] M2.5 Hacer Easy subconjunto estructural de Medium y Hard.
- [ ] M2.6 Garantizar semilla determinista y cero posiciones aleatorias en mapas finales.
- [ ] M2.7 Proyectar cada candidato con mouse, touch y pen y rechazar el mapa si un
  perfil excede alcance, giro, corredor, plazo o descanso despues de drag.
- [ ] M2.8 Conservar exactamente los mismos tiempos, tipos y cantidad de notas en
  todos los perfiles; solo la geometria final puede variar.

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
- un drag de mouse `presionar-seguir-soltar` y su equivalente touch resuelven la
  misma cabeza, checkpoints, destino y juicio musical;
- las proyecciones son deterministas y el validador informa el perfil que fallo;
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
- [ ] M4.7 Crear validador multiperfil de ventanas solapadas, velocidad espacial,
  bordes, drag, release de mouse, descanso y fases.
- [ ] M4.8 Permitir generación por pista, dificultad, preview y diff antes de sobrescribir.
- [ ] M4.9 Incluir en preview/diff las proyecciones mouse y touch sin guardar dos mapas.

Compuerta M4:

- los mapas siguen golpes y cambios de intensidad mejor que la cuadrícula anterior;
- no convierten cada onset en una nota;
- partes tranquilas respiran y clímax aumenta reto sin volverse imposible;
- los JSON son legibles, reproducibles, editables y bloqueables;
- ninguna correccion ergonomica runtime oculta un error estructural del generador;
- aprobar un mapa exige que sus proyecciones soportadas pasen el mismo validador.

## M5 - Visuales FFT en tiempo real

Objetivo: añadir microreacción visual sin permitir que el FFT afecte reglas.

- [ ] M5.1 Cambiar bandas porcentuales por rangos aproximados en Hz.
- [ ] M5.2 Normalizar contra promedio móvil para comparar canciones suaves/intensas.
- [ ] M5.3 Usar low para pulsación, volumen para glow y high para partículas sutiles.
- [ ] M5.4 Combinar intensidad offline macro con FFT micro, sin flashes duplicados.
- [ ] M5.5 Reducir muestras/efectos bajo el perfil visual reducido.
- [ ] M5.6 Respetar `RenderResolutionPolicy`; calidad grafica nunca selecciona ni
  modifica el perfil de interaccion.

Compuerta M5:

- desactivar FFT no cambia notas, score, timing ni resultados;
- no existe caída significativa de FPS en el móvil objetivo;
- visuales acompañan la música sin ocultar objetivos ni competir con Danger/FLOW;
- cambiar presupuesto de pixeles no cambia ninguna posicion o resultado jugable.

## M6 - Curación, automatización y salida

Objetivo: convertir el pipeline en el flujo normal para mantener contenido.

- [ ] M6.1 Curar al menos seis canciones completas y tres dificultades por canción.
- [ ] M6.2 Comparar BPM/estilos distintos y registrar correcciones de reglas.
- [ ] M6.3 Bloquear mapas aprobados y demostrar que regenerar no los altera.
- [ ] M6.4 Documentar desde descarga de Suno/Mureka hasta push y GitHub Pages.
- [ ] M6.5 Validar peso web, memoria, precarga, primer inicio y cambio de canción.
- [ ] M6.6 Probar PC, móvil, GitHub Pages y portal objetivo.
- [ ] M6.7 Decidir con evidencia si hace falta un editor visual sencillo.
- [ ] M6.8 Comparar por `inputProfileId` precision, combo, fallos de drag y FLOW
  antes de decidir si rankings pueden mezclar perfiles.

Compuerta M6:

- añadir una canción nueva es un proceso repetible y con validaciones claras;
- cada dificultad se siente musicalmente relacionada y sustancialmente diferente;
- rankings pueden comparar jugadores sobre mapas definitivos y conservan el perfil
  y la version espacial usados hasta demostrar equivalencia competitiva;
- progreso, estrellas y economia son portables entre dispositivos;
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
| 2026-08-14 | M1 | Implementada / prueba fisica pendiente | Suno Pilot 01 de 124.872 s, audio single, fases 0/34/82, revive desde limites, 38/62/90 notas; 25 pistas/75 mapas, npm test/build y presupuesto mouse-touch correctos |
| 2026-08-14 | M0 | Completada tecnicamente | 3 schemas, 47 metadata verificadas por SHA-256, version espacial/contrato centralizados, politica locked y comandos por pista; npm test/build correctos, chunk principal 477.33 kB |
| 2026-08-14 | Preparacion M0 | Completada | 23 MP3 Suno renombrados por hash y distribuidos como candidatas; quedan fuera del manifest v1 para proteger playback, memoria movil y la linea base de 24 canciones/72 mapas |
| 2026-08-13 | Planificación | No iniciado | M0-M6 adaptadas a Beatmap canonico, perfiles espaciales versionados y validacion mouse/touch; espera D0-D7 y cierre 11.5G |
