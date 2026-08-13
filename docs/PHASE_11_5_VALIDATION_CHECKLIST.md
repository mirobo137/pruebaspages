# Checklist fisico de salida 11.5G

Esta lista cierra la deuda humana de 11.5. No repite pruebas automaticas. Se ejecuta
una vez en PC con mouse y una vez en movil tactil antes de CrazyGames Preview.

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
