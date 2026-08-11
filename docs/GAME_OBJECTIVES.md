# Objetivos vivos del juego

Este archivo se puede editar despues de cada sesion de prueba. Representa lo que queremos conseguir, no una lista rigida de funcionalidades. Las casillas sirven para revisar que esta hecho, que esta en prueba y que aun debe esperar.

## Vision

Un juego casual de precision ritmica en el que el jugador pasa de escuchar la musica a sentirla con los dedos: anticipa, toca, desliza y encadena aciertos. Una partida debe poder empezar casi de inmediato, durar poco y dejar una razon clara para intentar superar el resultado.

Identidad provisional: **SUPERFLOW: RHYTHM RUSH**, una experiencia neon en la que la precision transforma progresivamente la pantalla.

## Bucle principal

1. El jugador pulsa JUGAR y ve una cuenta regresiva 3-2-1.
2. La cancion comienza automaticamente y aparecen objetivos sincronizados.
3. El jugador resuelve cada objetivo con la accion indicada.
4. Los aciertos aumentan puntos y combo; los errores rompen el ritmo.
5. La cancion completa tres fases y muestra el resultado, o termina antes si se agotan las vidas.
6. El jugador entiende que puede mejorar su precision, combo o puntuacion.

## Mecanicas

- [x] Toque sobre objetivo amarillo: acierto y puntos.
- [x] Slider curvo: acertar la cabeza y recorrer checkpoints sucesivos hasta el destino.
- [x] Fallar un objetivo o dejar pasar su ventana resta vida y rompe el combo.
- [x] Ventanas de timing Perfect, Bien y Miss.
- [x] Vida limitada y fin de partida.
- [x] Dificultades Facil, Medio y Dificil por cancion.
- [x] Tres fases de 30 segundos: Lectura, Impulso y Climax.
- [x] Audio corto en bucle con reloj continuo hasta 90 segundos.
- [x] Crossfade Web Audio entre fases para eliminar el hueco del loop nativo.
- [x] Menu inicial y pantalla de resultado.
- [x] Estrellas independientes por cancion y dificultad.
- [x] Records locales de puntuacion, combo, precision e intentos.
- [x] Guardado local versionado, validado, con checksum, respaldo y migracion.
- [x] Selector musical enriquecido con progreso visible y respuesta al cambio de dificultad.
- [x] Selector presentado como playlist con numeracion, scrollbar y guia tactil de desplazamiento.
- [x] Categorias Gratis, Economicas, Selectas y Premium sobre una unica playlist.
- [x] Precios calibrados por partidas objetivo: 0, 400, 800 y 1,400 monedas.
- [x] Catalogo original gratuito y categoria/precio automaticos segun carpeta de audio.
- [x] Preview de 5 segundos para canciones adquiridas y bloqueadas.
- [x] Musica provisional de portada/menu en bucle y regreso automatico despues de cada preview.
- [x] Memoria local de la ultima cancion y dificultad elegidas.
- [x] Portada de presentacion neon antes del selector de canciones.
- [x] Cuenta regresiva antes de iniciar sin segundo toque sobre el gameplay.
- [x] Pausa con Continuar, Reiniciar y Volver al menu.
- [x] Pausa automatica al ocultar la pagina o cambiar de aplicacion.
- [x] Entrada protegida de fases sin Miss o perdida de combo invisible.
- [x] Bloqueo de input entre el cruce de fase del audio y su procesamiento visual.
- [x] Transiciones sin vibracion ni shake que puedan sentirse como toque fantasma.
- [x] Rastro visual para objetivos de arrastre.
- [x] Beatmap JSON separado del codigo.
- [x] Cancion seleccionada automaticamente desde `public/assets/audio/`.
- [x] Beatmaps iniciales automaticos para que una cancion nueva entre al selector sin trabajo manual.
- [x] Build recursiva para Gratis, Economicas, Selectas y Premium con deteccion de IDs duplicados.
- [x] Feedback visual distinto para Perfect, Bien y Miss.
- [x] Objetivos con profundidad, brillo, reflejo y bordes finos.
- [x] Aros semanticos que hacen visibles las ventanas Bien y Perfect.
- [x] Reloj visual constante por dificultad, aislado del pulso cosmetico y de FLOW.
- [x] Objetivos simultaneos cuando la densidad supera la ventana de anticipacion.
- [x] Trayectoria drag fina con puntos guia y destino profesional.
- [x] Curvas Bezier procedurales y puntos de control opcionales desde el beatmap.
- [x] Cabeza, corredor y tiempo de finalizacion propios por dificultad.
- [x] Dos checkpoints con feedback visual y tactil antes del destino.
- [x] Medidor FLOW cargado mediante precision.
- [x] Estado FLOW temporal con puntuacion x2 y transformacion audiovisual.
- [x] Riesgo de romper FLOW inmediatamente al fallar.
- [x] SUPER FLOW x4 desbloqueado solo con cuatro Perfect consecutivos dentro de FLOW.
- [x] Bien degrada SUPER FLOW a FLOW x2; Miss rompe todo el estado.
- [ ] Feedback sonoro distinto para Perfect, Bien y Miss.
- [ ] Objetivos que se mueven con la musica.
- [ ] Cadenas de varios objetivos y patrones reconocibles.
- [ ] Objetivo hold, en el que hay que mantener presionado durante un intervalo.
- [x] Densidad, vidas y ventanas de timing diferenciadas por dificultad.
- [ ] Modo entrenamiento separado.

## Juice prioritario

El juice debe comunicar causa y recompensa. Primero puliremos lo que el jugador ve y oye en cada accion:

- [x] Particulas y anillo expansivo al acertar.
- [ ] Sonido corto de confirmacion y variaciones por combo.
- [x] Texto flotante `Perfect`, `Bien` o `Miss`.
- [x] Vibracion tactil opcional y respetuosa.
- [ ] Hit-stop o micro pausa solo en aciertos importantes.
- [ ] Fondo que respire con volumen, graves y agudos.
- [x] Pulsos o anillos sincronizados con el beat.
- [x] Primer efecto visual de combo mediante punch del HUD.
- [x] Transformacion completa del fondo, objetivos e impactos durante FLOW.
- [x] Pantalla, marco, objetivos e impactos exclusivos de SUPER FLOW.
- [x] Fondo procedural, particulas, shake y feedback visual sin assets externos.
- [x] Nebulosas, geometria FLOW, tunel SUPER FLOW y particulas geometricas.
- [ ] Indicadores que no dependan solo del color para accesibilidad.

## Prioridad tactil

- [x] Area de toque mayor que el circulo visible.
- [x] Captura de puntero durante arrastres.
- [x] Soporte para pointer cancel y salida del canvas.
- [x] Arrastre calculado sobre el trayecto y con tolerancia lateral.
- [x] Feedback visual inmediato incluso al tocar fuera de tiempo.
- [x] Bloqueo de scroll, seleccion y gestos del navegador sobre el canvas.
- [x] Lista de canciones desplazable con dedo y rueda del mouse.
- [x] Selector compacto de dificultad sin tres botones grandes.
- [x] Area logica adaptativa para touch, pen, mouse y pantallas pequenas.
- [x] Buffer temprano corto para absorber variacion real del dedo.
- [x] Compensacion limitada por timestamp para telefonos con input tardio.
- [x] Arrastre con tolerancia adicional, progreso monotono y final al 94% en touch.
- [x] Drag completado conservado al soltar dentro de la ventana temprana.
- [x] Limites de particulas, anillos y textos para proteger el frame rate.

## Enganche y retorno

La implementacion paso a paso y sus pruebas obligatorias se controlan en `docs/LIVEOPS_IMPLEMENTATION_PLAN.md`.

- [x] Monedas locales como base para desbloquear futuras canciones.
- [x] Recompensa monetaria normalizada por completar, precision, estrellas y dificultad.
- [x] Meta visible de corto plazo: cargar y mantener FLOW durante la partida.
- [x] Resumen de activaciones FLOW al terminar.
- [x] Resumen de activaciones SUPER FLOW al terminar.
- [x] Recompensa de monedas multiplicada por dificultad.
- [x] Mejor puntuacion local por cancion y dificultad.
- [x] Estadisticas de precision, maximo combo y errores.
- [ ] Reto diario determinista cuando exista una base de niveles estable.
- [x] Dificultades que cambian densidad, vidas, timing y tolerancia tactil.
- [ ] Resultado facil de compartir como imagen o texto.
- [ ] Desbloqueo cosmetico sin afectar la habilidad ni la justicia del juego.
- [ ] Coleccion de skins procedurales para objetivos, drag, FLOW y SUPER FLOW.
- [ ] Evento semanal de siete escalones con desbloqueo progresivo de una coleccion visual.
- [ ] Anuncio recompensado opcional para duplicar monedas al terminar.
- [ ] Segunda oportunidad recompensada que reinicia la fase de forma segura.
- [ ] Skin publicitaria rotativa sin encadenar anuncios.

La prioridad es que el jugador vuelva porque quiere superar su propio dominio, no por energia artificial o recompensas invasivas.

## Backend futuro

No implementar todavia. Cuando el juego tenga retencion basica, evaluar:

- ranking diario/semanal y ranking por cancion;
- validacion basica de puntuaciones;
- adaptador especifico para CrazyGames y otro para Poki;
- una solucion sencilla tipo Simpleboard si cubre el caso sin crear mantenimiento innecesario.

## Criterios de calidad

- Se entiende la accion sin tutorial largo.
- El primer intento empieza despues del primer toque, respetando las politicas de autoplay del navegador.
- La respuesta tactil y visual se siente inmediata.
- Los patrones son dificiles por precision y lectura, no por trampas.
- La dificultad crece de forma gradual.
- Una partida se puede reiniciar rapidamente.
- El juego funciona en una pantalla tactil pequena y con mouse.
- Cada cancion puede tener su propio beatmap sin modificar TypeScript.

## Hitos

### Hito 1 — Prototipo jugable

- [x] Reproducir la cancion despues de la primera interaccion.
- [x] Desbloquear audio desde JUGAR y comenzar despues de 3-2-1.
- [x] Detectar automaticamente archivos de audio nuevos.
- [x] Cargar el beatmap desde JSON.
- [x] Implementar toque, arrastre y peligro.
- [x] Mostrar puntuacion y combo basicos.
- [ ] Ajustar el beatmap provisional escuchando la cancion.

### Hito 2 — Juego presentable

- [x] Pantalla inicial y boton de jugar.
- [x] Pantalla de resultado y regreso al menu.
- [x] Resultado con estrellas obtenidas, precision y aviso de nuevo record.
- [x] Feedback visual de aciertos y errores.
- [x] Primera mecanica de enganche basada en habilidad: FLOW y multiplicador x2.
- [x] Recompensa avanzada de precision: SUPER FLOW y multiplicador x4.
- [x] Estructura de partida con crecimiento visual en tres fases.
- [x] Juice de particulas, combo y fondo reactivo.
- [ ] Feedback de audio corto para aciertos y combos.
- [ ] Pruebas reales en movil y distintos tamanos de pantalla.

### Hito 3 — Preparacion para portal

- [ ] Optimizar peso, carga y rendimiento.
- [ ] Crear icono, miniatura y textos de presentacion.
- [ ] Revisar privacidad, audio y recursos con licencia.
- [ ] Integrar el SDK del portal solo donde aporte valor.
- [ ] Preparar una build candidata para CrazyGames y/o Poki.

## Proxima sesion de pruebas

- [ ] Probar en movil pequeno, movil grande y escritorio con mouse.
- [ ] Probar especificamente en Android de gama baja a 60 Hz.
- [ ] Probar iPhone/Safari y rotacion de pantalla.
- [ ] Comparar touch con mouse para confirmar que la asistencia no trivializa el timing.
- [ ] Verificar taps muy rapidos, dedos alternados y arrastres diagonales.
- [ ] Probar curvas hacia ambos lados y confirmar que el dedo puede corregir una salida breve.
- [ ] Confirmar que cada checkpoint se activa en orden y que no es posible saltar directo al final.
- [ ] Confirmar una estrella al completar la cancion o alcanzar la gracia final de 0.8 segundos.
- [ ] Medir cuantas partidas reales requiere cada categoria y ajustar 400/800/1,400 con datos de prueba.
- [ ] Confirmar que el HUD inferior no invade la zona tactil.
- [ ] Medir si cuatro `Perfect` son una meta alcanzable y emocionante.
- [ ] Medir si cuatro `Perfect` adicionales dentro de FLOW hacen SUPER FLOW alcanzable sin volverlo comun.
- [ ] Confirmar que Bien degrada a FLOW y que el cambio se entiende sin leer instrucciones.
- [ ] Confirmar que los cambios de fase no emiten feedback fantasma ni alteran el medidor.
- [ ] Confirmar que el aro mantiene la misma velocidad en notas consecutivas de Medio y Dificil.
- [ ] Probar objetivos solapados y confirmar que cada toque resuelve el objetivo temporalmente correcto.
- [ ] Probar pausa durante tap, drag, FLOW, SUPER FLOW y cambio de fase.
- [ ] Probar cambio de aplicacion en Android/iPhone y confirmar la pausa automatica.
- [ ] Ajustar FLOW para una partida completa de 90 segundos.
- [ ] Confirmar que el loop de audio no tiene corte perceptible entre fases.
- [ ] Confirmar que Medio y Dificil siguen siendo exigentes pero legibles con dedo.
- [ ] Confirmar que los aros Bien/Perfect ayudan a aprender sin saturar la pantalla.
- [ ] Medir FPS durante SUPER FLOW en Android de gama baja.
- [x] Probar la lista con suficientes canciones para requerir scroll real.
- [ ] Confirmar en Android y iPhone que cada preview dura 5 segundos y vuelve al tema del menu.
- [ ] Confirmar que cancion, dificultad y fila visible se restauran tras jugar y recargar.
- [ ] Revisar que un `Miss` se sienta claro sin parecer injusto.
- [ ] Ajustar el beatmap de la cancion de prueba escuchando sus golpes reales.
- [x] Registrar mejor puntuacion local por cancion y dificultad.
- [ ] Confirmar que estrellas y records persisten despues de cerrar y volver a abrir el navegador.
- [ ] Confirmar que Facil, Medio y Dificil muestran progreso independiente para la misma cancion.

## Estado de una partida ideal

```text
JUGAR -> preparar audio -> 3, 2, 1 -> fase Lectura
30 segundos -> transicion segura -> Impulso con nuevo patron
60 segundos -> transicion segura -> Climax y mayor intensidad
aciertos -> combo y medidor FLOW
medidor completo -> FLOW x2 y progreso de precision
cuatro Perfect dentro de FLOW -> SUPER FLOW x4
Bien en SUPER FLOW -> regreso a FLOW x2
fallo -> perdida de vida, combo roto y ruptura total de FLOW
fin -> resultado, monedas y deseo de repetir para mejorar
```
