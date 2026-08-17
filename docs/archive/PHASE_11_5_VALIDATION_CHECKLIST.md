# Checklist fisico de salida 11.5G

Esta lista cierra la deuda humana de 11.5. No repite pruebas automaticas. Se ejecuta
una vez en PC con mouse y una vez en movil tactil antes de CrazyGames Preview.

## Estado acumulado - 2026-08-13

Evidencia aprobada:

- [x] PC mouse `balanced`, 1335x1032: asistencia direccional descrita como mucho
  mejor y Dificil jugable; 19 drags con cero fallos de recorrido/release.
- [x] PC acelerada: 60 FPS en charging, FLOW y SUPER FLOW.
- [x] Fullscreen y ventana normal: playfield mouse permanece centrado en 820x680.
- [x] Backend por software: calidad minimal se activa; al recuperar RTX se restaura.
- [x] Movil por LAN: regresion tactil funcional y sensacion original aprobadas.
- [x] FLOW y SUPER FLOW alcanzados en partida real sin degradacion de frames.
- [x] Suite completa, build, 24 canciones y 72 beatmaps aprobados.
- [x] Resultado tecnico versionado por perfil/modelo y progreso compartido comprobados.
- [x] Mouse Medio `balanced`: 2 partidas completas, 78.8% de precision media,
  combo medio 29, 10.5 activaciones FLOW, 5 SUPER y 60,135 px de recorrido.
- [x] Mouse Facil `balanced`: 1 partida completa, 89.3% de precision, combo 45,
  2 misses, 2 FLOW, 3 SUPER y velocidad maxima exigida de 388 px/s.
- [~] Mouse Dificil `balanced`: 2 intentos no completados, 47.8% de precision,
  combo medio 4.5 y velocidad maxima 1,071.4 px/s dentro del presupuesto 1,100;
  4 `tap-timeout` coinciden con 4 pulsaciones vacias. Se aplica +10 px solo a la
  adquisicion de cabeza mouse+Dificil; pendiente repetir.
- [~] Mouse Dificil tras +10 px: 52/61 aciertos, SUPER alcanzado y 60 FPS; 8 de 9
  misses fueron `tap-timeout` y coinciden con 8 pulsaciones vacias. La tasa espacial
  mejora, pero aun impide completar. Se calibra bonus final +20 px y se versiona v3.
- [~] Mouse Dificil v3 +20 px: 60/69 aciertos, 38 Perfect, 22 Bien, SUPER y 60 FPS.
  Los 9 misses se dividen en 4 timeout, 4 pulsaciones tardias y 1 drag temprano;
  el usuario lo considera mucho mas alcanzable y capaz de completar con esfuerzo.
  Balance aprobado; falta una finalizacion completa para cerrar la ruta formal.
- [x] Mouse Dificil v3: 7 intentos, 1 finalizacion completa, 73.5% de precision
  media, combo medio 26.9, 6 FLOW y 3 SUPER. Exigente pero completable.
- [x] Danger, ruptura y panel de derrota descritos como correctos tanto en PC como
  en movil antes del ultimo ajuste de volumen.
- [x] Aciertos elevados y firmas distintas FLOW/SUPER aprobados fisicamente tras
  reforzar presencia; son notorios sin modificar MISS ni el volumen de la musica.

Pendiente para cierre formal:

- [x] Completar Facil, Medio y Dificil con mouse; Dificil conserva una tasa de
  finalizacion baja pero tiene evidencia real de una partida completa.
- [ ] Repetir las tres dificultades touch y registrar vertical/horizontal.
- [ ] Ejecutar las rutas auditivas de Danger/FLOW descritas abajo.
- [ ] Ejecutar derrota en las tres fases y revive exitoso/cancelado/no disponible.
- [ ] Sacar y liberar el puntero fuera del canvas/iframe durante un drag.
- [ ] Ejecutar CrazyGames Preview y Poki Inspector despues de cerrar 11.5G.

## Datos de cada sesion

- Dispositivo, navegador y resolucion/orientacion.
- Cancion y dificultad.
- Metodo de entrada: mouse, touch o pen.
- Variante mouse usada: `balanced`, `compact` o `expansive`.

## PC con mouse

1. Jugar una cancion completa en Facil, Medio y Dificil con `balanced`.
2. Repetir Dificil con `?mouseReach=compact` y `?mouseReach=expansive`.
3. Elegir la variante que reduzca barridos vacios sin volver trivial el patron.
4. Confirmar que mira/estela siguen el mouse y desaparecen al usar touch en un equipo hibrido.
5. Confirmar que combo, progreso FLOW y ruptura se leen sin mirar el HUD superior.

## Movil touch

1. Jugar Facil, Medio y Dificil en vertical.
2. Rotar antes de otra partida y jugar en horizontal.
3. Probar tap temprano, dos notas cercanas y todos los tipos de drag.
4. Confirmar que el campo, hitbox y asistencia se sienten iguales a la build aprobada.
5. Confirmar que combo focal nunca tapa el siguiente objetivo.

## Audio, Danger y FLOW

1. Provocar Miss sin combo, Miss con combo y derrota; los tres deben usar `miss.wav` claramente.
2. Probar altavoz y audifonos: el WAV no debe tapar la siguiente nota ni sonar excesivo.
3. Llegar a una vida: el marco debe advertir sin parecer otro Miss ni ocultar objetivos.
4. Recuperar vida con Perfect: Danger debe desaparecer inmediatamente.
5. Activar FLOW, esperar y cruzar fase sin tocar notas: FLOW no debe cambiar.
6. En FLOW, Bien conserva; en SUPER, Bien degrada; Miss rompe ambos.

## Derrota y anuncios

1. Perder en Lectura, Impulso y Climax.
2. Desde derrotas separadas probar Resultado, Reintentar y Playlist.
3. Probar revive exitoso, cancelado y no disponible en el entorno del portal.
4. Confirmar una sola suma de monedas, intento, evento y record en cada ruta.
5. Confirmar que `miss.wav` termina y la musica no continua detras del panel.

## Criterio de aprobacion

- Mouse y touch son precisos, ritmicos y comparables.
- No hay audio cortado, notas tapadas, FLOW fantasma ni recompensa duplicada.
- No hay caidas perceptibles de fluidez en el movil objetivo.
- El probador entiende Danger, combo, FLOW y las decisiones de derrota sin explicacion.

Registrar cada problema con dispositivo, dificultad, momento de la cancion y una
descripcion observable. La fase solo se marca completada cuando PC y movil aprueban.

## Extension de cierre para Fases 12 y 13

### Poki Inspector

1. Cargar `dist` y confirmar un solo `gameLoadingFinished`.
2. Verificar pares `gameplayStart`/`gameplayStop` al jugar, pausar, revivir y terminar.
3. Probar revive, duplicacion y skin con anuncio completado y cancelado.
4. Confirmar que solo la finalizacion positiva concede contenido.
5. Revisar Event Log en escritorio y repetir la ruta principal con el QR movil.
6. Confirmar eventos `song start` y exactamente un `complete` o `fail` por intento.
7. Confirmar pares `rewarded visible`/`interact`; no deben aparecer eventos manuales que dupliquen el resultado automatico del anuncio.

### CrazyGames Preview

1. Repetir revive, duplicacion y skin en el Preview Tool.
2. Confirmar mute, pausa, reanudacion y eventos de gameplay sin duplicados.
3. Revisar que el panel nativo reciba conversion, tiempo jugado y sesiones.

### Interruptores de QA

En desarrollo o preview, comprobar por separado:

- `?rewardedAds=off`: oculta todas las ofertas.
- `?rewardedRevive=off`: solo oculta revive.
- `?rewardedCoinDouble=off`: solo oculta duplicacion.
- `?rewardedDailyCosmetic=off`: conserva compra por monedas y oculta el anuncio.

### Lanzamiento controlado

1. No modificar frecuencia ni valor de anuncios durante la muestra inicial.
2. Registrar sesiones, canciones iniciadas/completadas, retorno, evento y embudos recompensados.
3. Comparar ofertas visibles contra interacciones y recompensas confirmadas.
4. Revisar abandono en derrota y resultado antes de aumentar exposicion.
5. Mantener siempre una ruta sin anuncios.
