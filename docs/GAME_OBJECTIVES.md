# Objetivos vivos del juego

Este archivo se puede editar despues de cada sesion de prueba. Representa lo que queremos conseguir, no una lista rigida de funcionalidades. Las casillas sirven para revisar que esta hecho, que esta en prueba y que aun debe esperar.

## Vision

Un juego casual de precision ritmica en el que el jugador pasa de escuchar la musica a sentirla con los dedos: anticipa, toca, desliza y encadena aciertos. Una partida debe poder empezar casi de inmediato, durar poco y dejar una razon clara para intentar superar el resultado.

## Bucle principal

1. El jugador toca la pantalla para desbloquear el audio.
2. La cancion empieza y aparecen objetivos sincronizados.
3. El jugador resuelve cada objetivo con la accion indicada.
4. Los aciertos aumentan puntos y combo; los errores rompen el ritmo.
5. La partida termina o entra en una nueva ronda y muestra el resultado.
6. El jugador entiende que puede mejorar su precision, combo o puntuacion.

## Mecanicas

- [x] Toque sobre objetivo amarillo: acierto y puntos.
- [x] Objetivo de arrastre: mantener el dedo/mouse y alcanzar una distancia minima.
- [x] Fallar un objetivo o dejar pasar su ventana resta vida y rompe el combo.
- [x] Ventanas de timing Perfect, Bien y Miss.
- [x] Vida limitada y fin de partida.
- [x] Modo Cancion y modo Supervivencia.
- [x] Menu inicial y pantalla de resultado.
- [x] Rastro visual para objetivos de arrastre.
- [x] Beatmap JSON separado del codigo.
- [x] Cancion seleccionada automaticamente desde `public/assets/audio/`.
- [x] Feedback visual distinto para Perfect, Bien y Miss.
- [ ] Feedback sonoro distinto para Perfect, Bien y Miss.
- [ ] Objetivos que se mueven con la musica.
- [ ] Cadenas de varios objetivos y patrones reconocibles.
- [ ] Objetivo hold, en el que hay que mantener presionado durante un intervalo.
- [x] Modo Supervivencia como partida sin duracion fija.
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
- [ ] Indicadores que no dependan solo del color para accesibilidad.

## Prioridad tactil

- [x] Area de toque mayor que el circulo visible.
- [x] Captura de puntero durante arrastres.
- [x] Soporte para pointer cancel y salida del canvas.
- [x] Arrastre calculado sobre el trayecto y con tolerancia lateral.
- [x] Feedback visual inmediato incluso al tocar fuera de tiempo.
- [x] Bloqueo de scroll, seleccion y gestos del navegador sobre el canvas.

## Enganche y retorno

- [x] Monedas locales como base para desbloquear futuras canciones.
- [ ] Mejor puntuacion local por cancion.
- [ ] Estadisticas de precision, maximo combo y errores.
- [ ] Reto diario determinista cuando exista una base de niveles estable.
- [ ] Dificultades o modificadores que cambien la lectura del patron.
- [ ] Resultado facil de compartir como imagen o texto.
- [ ] Desbloqueo cosmetico sin afectar la habilidad ni la justicia del juego.

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
- [x] Detectar automaticamente archivos de audio nuevos.
- [x] Cargar el beatmap desde JSON.
- [x] Implementar toque, arrastre y peligro.
- [x] Mostrar puntuacion y combo basicos.
- [ ] Ajustar el beatmap provisional escuchando la cancion.

### Hito 2 — Juego presentable

- [x] Pantalla inicial y boton de jugar.
- [x] Pantalla de resultado y regreso al menu.
- [x] Feedback visual de aciertos y errores.
- [ ] Juice de particulas, audio, combo y fondo reactivo.
- [ ] Pruebas reales en movil y distintos tamanos de pantalla.

### Hito 3 — Preparacion para portal

- [ ] Optimizar peso, carga y rendimiento.
- [ ] Crear icono, miniatura y textos de presentacion.
- [ ] Revisar privacidad, audio y recursos con licencia.
- [ ] Integrar el SDK del portal solo donde aporte valor.
- [ ] Preparar una build candidata para CrazyGames y/o Poki.
