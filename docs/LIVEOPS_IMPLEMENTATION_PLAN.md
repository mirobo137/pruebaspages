# Hoja de ruta de skins, eventos y anuncios

Este documento es el plan ejecutable para incorporar personalizacion, evento semanal y anuncios recompensados a **SUPERFLOW**. Se trabaja estrictamente de arriba hacia abajo: una fase solo puede marcarse como completada cuando cumple su compuerta de calidad.

## Estado de ejecucion

- Estado general: `EN PROGRESO`
- Fase activa: `Fase 11 - Validacion del adaptador CrazyGames`
- Siguiente accion: `Probar SDK oficial en localhost y subir una build al Preview Tool de CrazyGames`
- Ultima actualizacion: `2026-08-13`

Estados permitidos:

- `[ ]` Pendiente.
- `[~]` En progreso. Solo puede existir una fase en este estado.
- `[x]` Completado y probado.
- `[!]` Bloqueado; debe documentarse la causa en el registro de ejecucion.

## Regla de avance

No comenzar la siguiente fase hasta que la fase actual cumpla todo lo siguiente:

1. `npm run build` termina sin errores.
2. No aparecen errores nuevos en consola durante el flujo modificado.
3. El juego sigue siendo jugable con mouse y touch.
4. La musica, pausa, cambios de fase, FLOW y SUPER FLOW mantienen su sincronizacion.
5. No se pierden monedas, desbloqueos, estrellas ni records existentes.
6. La prueba movil indicada para la fase fue realizada.
7. Los resultados se anotaron en el registro de ejecucion de este documento.

Si una prueba falla, la fase permanece en progreso. Primero se corrige y se repite su compuerta; no se compensa el fallo avanzando a otra funcionalidad.

## Principios del sistema

- Las skins son visuales: nunca cambian hitboxes, timing, posiciones logicas ni asistencia tactil.
- Los temas se generan con PixiJS y datos; no requieren imagenes externas.
- Geometrias repetidas se preparan y reutilizan. No se reconstruyen cientos de `Graphics` cada frame.
- Los filtros y shaders son opcionales, limitados y tienen una variante de bajo costo para moviles modestos.
- Los premios de evento no aumentan poder ni hacen una dificultad mas facil.
- Los anuncios siempre son voluntarios y aparecen fuera del gameplay activo.
- Una recompensa se entrega solo cuando el SDK confirma que el anuncio termino correctamente.
- GitHub Pages y desarrollo local usan un adaptador de simulacion; no cargan redes publicitarias reales.
- CrazyGames y Poki se integran mediante adaptadores separados, nunca desde las escenas.

## Fase 0 - Linea base y proteccion contra regresiones

Objetivo: registrar el comportamiento actual antes de modificar renderizado, progreso o audio.

- [x] 0.1 Ejecutar `npm run build` en el estado actual.
- [x] 0.2 Probar una cancion completa sin FLOW, con FLOW y con SUPER FLOW.
- [x] 0.3 Probar tap, drag, pausa, reanudacion y cambio de aplicacion.
- [x] 0.4 Confirmar persistencia de monedas, estrellas, records y seleccion del menu.
- [x] 0.5 Registrar dispositivo, navegador, orientacion y observaciones.

Compuerta especifica:

- La linea base tiene una prueba completa documentada en movil.
- Cualquier error previo detectado queda anotado y no se atribuye a las fases siguientes.

## Fase 1 - Dominio modular de temas visuales

Objetivo: representar una skin completa como datos, manteniendo el aspecto actual como tema predeterminado.

Entregables previstos:

```text
src/customization/
  ThemeTypes.ts
  ThemeCatalog.ts
  ThemeSelection.ts
  themes/
    defaultTheme.ts
```

- [x] 1.1 Definir contratos para objetivo, drag, impacto, FLOW y SUPER FLOW.
- [x] 1.2 Convertir el aspecto actual en `defaultTheme` sin cambios visibles.
- [x] 1.3 Inyectar el tema desde `GameApplication` sin importaciones globales ocultas.
- [x] 1.4 Separar valores visuales de reglas de gameplay.
- [x] 1.5 Añadir validacion y fallback cuando un tema este incompleto.

Compuerta especifica:

- El tema predeterminado se ve y se siente igual que antes.
- Cambiar colores o forma desde un unico objeto de configuracion se refleja en todo el gameplay.
- La misma partida y los mismos inputs producen el mismo resultado con cualquier tema.

## Fase 2 - Renderizado de skins procedurales

Objetivo: demostrar variedad visual real sin assets externos ni degradacion tactil.

- [x] 2.1 Crear al menos tres familias de objetivo: orbital, facetada y segmentada.
- [x] 2.2 Crear variantes de aro, checkpoints, destino y estela de drag.
- [x] 2.3 Crear particulas e impactos asociados al tema.
- [x] 2.4 Crear dos fondos FLOW y dos fondos SUPER FLOW claramente diferenciados.
- [x] 2.5 Reutilizar `Graphics`, geometria o texturas generadas cuando corresponda.
- [x] 2.6 Incorporar perfil visual `reduced` para dispositivos de bajo rendimiento.

Compuerta especifica:

- Tres temas son distinguibles en menu, gameplay, FLOW y SUPER FLOW.
- No hay caidas tactiles perceptibles durante SUPER FLOW en el movil de prueba.
- Los efectos tienen `eventMode = none` y no interceptan toques.
- No se modifica geometria compleja masivamente cada frame.

## Fase 3 - Coleccion, previsualizacion y equipamiento

Objetivo: permitir consultar, previsualizar y equipar contenido visual sin entrar a una partida completa.

- [x] 3.1 Crear pantalla `Coleccion` accesible desde el selector musical.
- [x] 3.2 Mostrar bloqueado, disponible, equipado y origen del desbloqueo.
- [x] 3.3 Crear una previsualizacion animada de objetivo, drag, FLOW y SUPER FLOW.
- [x] 3.4 Equipar el tema completo y persistirlo en un almacenamiento cosmetico provisional.
- [x] 3.5 Garantizar navegacion y scroll tactil en pantallas pequenas.

Compuerta especifica:

- El tema equipado permanece despues de recargar.
- La previsualizacion no inicia la musica de gameplay ni deja audio duplicado.
- Es imposible equipar contenido bloqueado mediante la interfaz.

## Fase 4 - Persistencia version 3 y migracion

Objetivo: guardar inventario, tema equipado y futuro progreso de eventos sin perder datos version 2.

- [x] 4.1 Diseñar `ProgressState` version 3.
- [x] 4.2 Guardar temas/componentes desbloqueados y seleccion equipada.
- [x] 4.3 Reservar estructura compacta para evento semanal y limites publicitarios.
- [x] 4.4 Migrar automaticamente version 2 a version 3.
- [x] 4.5 Validar datos corruptos, IDs eliminados y tema equipado inexistente.
- [x] 4.6 Mantener checksum y respaldo de recuperacion.

Compuerta especifica:

- Una copia real del progreso version 2 migra conservando todos sus datos.
- Recargar conserva inventario, tema equipado y progreso musical.
- Un tema retirado vuelve de forma segura al predeterminado.

## Fase 5 - Motor de evento semanal

Objetivo: crear un evento determinista de siete dias que funcione inicialmente sin backend.

Entregables previstos:

```text
src/events/
  EventTypes.ts
  EventCatalog.ts
  EventClock.ts
  WeeklyEventEngine.ts
  EventMissionEvaluator.ts
public/assets/events/
  weekly-events.json
```

- [x] 5.1 Definir ID, inicio, fin, tema, misiones, puntos y siete premios.
- [x] 5.2 Calcular la semana activa con lunes 00:00 UTC como limite estable.
- [x] 5.3 Crear misiones basadas en datos existentes: completar, Perfect, combo, FLOW y SUPER FLOW.
- [x] 5.4 Evaluar progreso al terminar una partida, nunca durante callbacks visuales.
- [x] 5.5 Evitar reclamar dos veces el mismo escalon y exigir orden ascendente.
- [x] 5.6 Manejar cambio de semana y evento inexistente o invalido sin romper el juego.
- [x] 5.7 Documentar que el reloj local es manipulable y suficiente solo para prototipo.

Compuerta especifica:

- Una misma fecha y progreso siempre producen el mismo evento y estado.
- Cambiar de cancion o dificultad no reinicia misiones acumulativas.
- Los siete premios se reclaman una sola vez y en orden.
- El juego abre normalmente si el JSON de eventos esta ausente o es invalido.

## Fase 6 - Interfaz y recompensa del evento

Objetivo: mostrar una ruta semanal clara y entregar progresivamente una skin completa.

Orden base de recompensas:

1. Paleta del objetivo.
2. Aro de aproximacion.
3. Estela de drag.
4. Impacto de Perfect.
5. Fondo FLOW.
6. Fondo SUPER FLOW.
7. Conjunto completo e insignia.

- [x] 6.1 Crear acceso visible pero no invasivo desde el menu.
- [x] 6.2 Mostrar tiempo restante, progreso total y proxima recompensa.
- [x] 6.3 Mostrar tres misiones activas con progreso numerico.
- [x] 6.4 Crear animacion de reclamacion y equipamiento opcional.
- [x] 6.5 Añadir indicador cuando existe un premio pendiente.
- [x] 6.6 Confirmar que perder una semana no destruye recompensas ya obtenidas.
- [x] 6.7 Mostrar una previsualizacion animada de la skin final desde el propio evento.
- [x] 6.8 Permitir usar cada componente reclamado sin esperar al conjunto completo.
- [x] 6.9 Crear un unico slot persistente `MI SKIN` para combinar seis categorias.
- [x] 6.10 Validar que el editor solo ofrezca componentes realmente desbloqueados.
- [x] 6.11 Guardar y equipar la skin personalizada como un tema real de gameplay.

Compuerta especifica:

- El jugador entiende que debe jugar para avanzar sin leer instrucciones extensas.
- Las recompensas aparecen inmediatamente en Coleccion.
- El evento no abre popups durante una partida.

## Fase 7 - Servicio neutral de anuncios recompensados

Objetivo: preparar anuncios sin acoplar gameplay a CrazyGames o Poki.

Entregables previstos:

```text
src/monetization/
  RewardedAdsService.ts
  RewardTypes.ts
  RewardGrantGuard.ts
  DevelopmentAdsService.ts
  UnavailableAdsService.ts
```

- [x] 7.1 Definir resultados `rewarded`, `cancelled`, `unavailable` y `error`.
- [x] 7.2 Crear adaptador de simulacion habilitado solo en desarrollo.
- [x] 7.3 Ocultar o sustituir ofertas cuando los anuncios no esten disponibles.
- [x] 7.4 Bloquear doble solicitud mientras una peticion este pendiente.
- [x] 7.5 Pausar input y audio solo cuando corresponda al ciclo del SDK.
- [x] 7.6 Entregar y guardar cada recompensa exactamente una vez.

Compuerta especifica:

- Simular exito, cancelacion, falta de anuncio y error no congela el juego.
- Un callback duplicado no duplica monedas ni desbloqueos.
- GitHub Pages funciona sin cargar un SDK publicitario.

## Fase 8 - Duplicar monedas al terminar

Objetivo: introducir el primer anuncio recompensado en el punto menos invasivo.

- [x] 8.1 Mostrar `Continuar` y `Duplicar monedas` con igual claridad visual.
- [x] 8.2 Explicar el valor exacto antes de solicitar el anuncio.
- [x] 8.3 Permitir una sola duplicacion por partida.
- [x] 8.4 Guardar las monedas extra inmediatamente despues del exito.
- [x] 8.5 Continuar normalmente si el anuncio falla o no esta disponible.
- [x] 8.6 Registrar si la partida ya utilizo una oportunidad recompensada.

Compuerta especifica:

- Exito duplica solo la recompensa de esa partida, no el saldo completo.
- Cancelacion o error no entregan monedas.
- Pulsaciones repetidas no crean solicitudes ni premios duplicados.

## Fase 9 - Segunda oportunidad por fase

Objetivo: permitir una recuperacion justa sin reanudar abruptamente despues de un anuncio.

Flujo acordado:

```text
fallo -> resultado de segunda oportunidad -> anuncio voluntario
      -> limpiar objetivos -> restaurar vida parcial
      -> reiniciar la fase actual -> cuenta 3, 2, 1 -> gameplay
```

- [x] 9.1 Crear checkpoint seguro al inicio de Lectura, Impulso y Climax.
- [x] 9.2 Restaurar score y progreso acordados sin duplicar eventos ya premiados.
- [x] 9.3 Reiniciar combo y FLOW; recuperar una cantidad de vida balanceada.
- [x] 9.4 Limpiar targets, buffers de input y punteros capturados antes del conteo.
- [x] 9.5 Limitar a una segunda oportunidad por partida.
- [x] 9.6 No ofrecer duplicar monedas si la partida ya utilizo el anuncio de reanimacion.
- [x] 9.7 Definir politica futura para rankings de partidas asistidas.

Compuerta especifica:

- Nunca se reanuda con notas vencidas, misses fantasma o input residual.
- El audio y beatmap reinician juntos desde el comienzo de la fase.
- No se puede obtener dos veces la recompensa de una seccion repetida.
- Rechazar o perder el anuncio permite salir al resultado normalmente.

## Fase 10 - Skin recompensada rotativa

Objetivo: ofrecer cosmeticos opcionales sin reducir el valor del evento semanal.

- [x] 10.1 Crear una seleccion separada de skins publicitarias basicas.
- [x] 10.2 Rotar una oferta diaria de forma determinista.
- [x] 10.3 Un anuncio concede una recompensa completa; nunca varios anuncios encadenados.
- [x] 10.4 Definir recompensa permanente por anuncio, sin alquiler de 24 horas.
- [x] 10.5 Limitar la oferta publicitaria de Coleccion a una oportunidad diaria.
- [x] 10.6 Ofrecer alternativa de 1,200 monedas para la misma skin del dia.

Compuerta especifica:

- La oferta indica claramente que requiere anuncio y que es opcional.
- No aparece como disponible cuando el adaptador no puede servir anuncios.
- Las skins semanales siguen siendo visualmente mas especiales.

## Fase 11 - Adaptador CrazyGames

Objetivo: conectar recompensas y guardado con el SDK oficial sin afectar GitHub Pages.

- [x] 11.1 Detectar entorno local, CrazyGames y deshabilitado.
- [x] 11.2 Implementar rewarded ads y sus callbacks oficiales.
- [x] 11.3 Mutear y pausar correctamente durante el anuncio.
- [x] 11.4 Manejar `unfilled`, adblock, cooldown y errores.
- [x] 11.5 Ocultar ofertas cuando el SDK reporte `adsDisabledBasicLaunch`.
- [x] 11.6 Preparar migracion de progreso al modulo Data cuando corresponda.
- [~] 11.7 Probar en localhost y en Preview de CrazyGames.

Compuerta especifica:

- Cumple las reglas vigentes de anuncios de CrazyGames.
- El juego siempre puede jugarse con adblock o sin inventario publicitario.
- No se combinan midgame y rewarded en el mismo descanso.

## Fase 12 - Adaptador Poki

Objetivo: implementar el mismo contrato mediante `rewardedBreak` y eventos de gameplay.

- [ ] 12.1 Implementar deteccion y carga segura del SDK de Poki.
- [ ] 12.2 Mapear `rewardedBreak` al resultado neutral.
- [ ] 12.3 Emitir `gameplayStop` y `gameplayStart` solo en los puntos correctos.
- [ ] 12.4 Probar revive, duplicacion y skin en Poki Inspector.
- [ ] 12.5 Confirmar que la build sin Poki sigue funcionando.

Compuerta especifica:

- Los eventos aparecen en el Inspector en el orden esperado.
- Audio, input y partida no avanzan mientras el anuncio esta activo.
- Una respuesta sin recompensa no entrega contenido.

## Fase 13 - Balance, telemetria y lanzamiento controlado

Objetivo: comprobar que eventos y anuncios mejoran retorno sin dañar la experiencia.

- [ ] 13.1 Medir inicio de sesion, cancion iniciada/completada y regreso diario.
- [ ] 13.2 Medir apertura, participacion y finalizacion del evento semanal.
- [ ] 13.3 Medir ofertas mostradas, aceptadas, completadas y no disponibles.
- [ ] 13.4 Revisar frecuencia de revive y duplicacion antes de aumentarla.
- [ ] 13.5 Mantener anuncios desactivables por configuracion de plataforma.
- [ ] 13.6 Publicar primero a un grupo o entorno de prueba.

Compuerta especifica:

- No hay aumento significativo de abandonos en resultado o pantalla de derrota.
- El juego conserva una ruta clara para quien nunca quiera ver anuncios.
- Las metricas permiten distinguir retencion, participacion y monetizacion.

## Matriz minima de pruebas

Cada fase visual, tactil o publicitaria debe cubrir:

| Entorno | Entrada | Orientacion | Prueba principal |
|---|---|---|---|
| Escritorio | Mouse | Horizontal | Navegacion, consola y flujo completo |
| Android pequeño | Touch | Vertical | Precision, scroll y rendimiento |
| Android grande | Touch | Vertical | Escala, bordes y FLOW/SUPER FLOW |
| GitHub Pages | Touch o mouse | Aplicable | Rutas, persistencia y ausencia de SDK real |
| Portal objetivo | Touch o mouse | Aplicable | Ciclo oficial de anuncios y guardado |

iPhone/Safari se incorpora a la compuerta antes de una presentacion formal a portales, aunque no siempre este disponible en cada iteracion local.

## Registro de ejecucion

Agregar una fila al completar o bloquear una fase. No borrar entradas anteriores.

| Fecha | Fase | Commit/build | Dispositivo | Resultado | Observaciones |
|---|---|---|---|---|---|
| 2026-08-11 | Planificacion | Sin build | N/A | Plan creado | Pendiente iniciar Fase 0 |
| 2026-08-11 | Fase 0 | `npm run build` | Windows / Node 24 | Correcto | 24 canciones detectadas, beatmaps completos, TypeScript y Vite sin errores |
| 2026-08-11 | Fase 0 | Servidor Vite local | Navegador Codex, 1280x720 y viewport 390x844 | Parcial correcto | Portada, entrada, inicio y controles ejercitados sin errores ni warnings; falta confirmar sensacion y persistencia en movil fisico |
| 2026-08-11 | Fase 0 | GitHub Pages actual | Movil fisico del usuario | Aprobado | Usuario confirma touch, FLOW, pausa y persistencia correctos; se habilita Fase 1 |
| 2026-08-11 | Fase 1 | `npm run test:theme` + `npm run build` | Windows / Node 24 | Implementacion correcta | Fallback parcial/invalido probado; portada, partida, pausa y viewport 390x844 sin errores; falta aprobacion visual y tactil en movil fisico |
| 2026-08-11 | Fase 1 | GitHub Pages actual | Movil fisico del usuario | Aprobado | Neon Pulse conserva el aspecto y comportamiento anterior; se habilita Fase 2 |
| 2026-08-11 | Fase 2 | `npm run test:theme` + `npm run build` | Windows / Node 24 y navegador 390x844 | Implementacion correcta | Tres temas y perfil reducido cargan sin errores; queda pendiente evaluar legibilidad, SUPER FLOW y fluidez tactil en movil fisico |
| 2026-08-11 | Fase 2 | GitHub Pages actual | Movil fisico del usuario | Aprobado | Usuario aprueba diferencias visuales y rendimiento; se habilita Fase 3 |
| 2026-08-11 | Fase 3 | `npm run test:theme` + `npm run build` | Windows / Node 24 y navegador 390x844 | Implementacion correcta | Navegacion, preview, scroll, bloqueo, equipamiento y recarga probados sin errores; falta aprobacion en movil fisico |
| 2026-08-12 | Fase 3 | GitHub Pages actual | Movil fisico del usuario | Aprobado | Usuario aprueba Coleccion, preview, scroll y equipamiento; se habilita Fase 4 |
| 2026-08-12 | Fase 4 | `npm test` + `npm run build` | Windows / Node 24 | Implementacion correcta | Migracion v2, seleccion provisional, backup corrupto, IDs retirados y persistencia v3 probados; navegador local no disponible en esta sesion, falta validacion movil fisica |
| 2026-08-12 | Fase 4 | GitHub Pages actual | Movil fisico del usuario | Aprobado | Usuario confirma que progreso, inventario y tema equipado se conservaron; se habilita Fase 5 |
| 2026-08-12 | Fase 5 | `npm test` + `npm run build` | Windows / Node 24 | Implementacion correcta | Catálogo JSON, semana UTC, acumulacion, rollover, ausencia de evento y siete reclamaciones unicas/ordenadas probados; falta validacion tras partidas reales |
| 2026-08-12 | Fase 5 | GitHub Pages actual | Movil fisico del usuario | Aprobado | Usuario confirma el comportamiento del motor semanal; se habilita Fase 6 |
| 2026-08-12 | Fase 6 | `npm test` + `npm run build` | Windows / Node 24 | Implementacion correcta | Pantalla semanal, scroll, cuenta UTC, indicador pendiente, reclamacion atomica, siete componentes y desbloqueo persistente de Neon Ascent probados; falta validacion movil fisica |
| 2026-08-12 | Fase 6 | `npm run test:layout` | 9 viewports de 320x568 a 915x412 | Correccion responsive | Cabecera, navegacion, playlist, dificultad y JUGAR verificados sin superposicion ni salida del viewport; en alturas compactas se oculta solo informacion secundaria |
| 2026-08-12 | Fase 6 | `npm test` + `npm run build` | Windows / Node 24 | Ampliacion correcta | Vitrina animada de recompensa final, piezas independientes, editor MI SKIN, composicion segura, slot unico y persistencia tras recarga verificados; falta aprobacion tactil y visual en movil |
| 2026-08-12 | Fase 6 | GitHub Pages actual | Movil fisico del usuario | Aprobado | Usuario aprueba evento, preview final, piezas y MI SKIN; se habilita Fase 7 |
| 2026-08-12 | Fase 7 | `npm test` + `npm run build` | Windows / Node 24 | Implementacion correcta | Exito, cancelacion, indisponibilidad, error, doble solicitud, inicio duplicado y entrega unica probados; produccion usa proveedor no disponible y no muestra ofertas |
| 2026-08-12 | Fase 7 | GitHub Pages actual | Movil fisico del usuario | Aprobado | Usuario confirma que el juego permanece normal sin SDK ni ofertas; se habilita Fase 8 |
| 2026-08-12 | Fase 8 | `npm test` + `npm run build` | Windows / Node 24 | Implementacion correcta | Duplicacion exacta del premio de partida, ID persistente, bloqueo de taps, cuatro resultados y layout de Resultado en nueve viewports probados; falta validacion local/movil |
| 2026-08-12 | Fase 8 | Desarrollo local / movil del usuario | Proveedor simulado | Aprobado | Usuario aprueba duplicacion de monedas y habilita Fase 9 |
| 2026-08-12 | Fase 9 | `npm test` + `npm run build` | Windows / Node 24 | Implementacion correcta | Checkpoints de tres fases, rollback de score/eventos, vida parcial, FLOW limpio, seek de beatmap, offset de audio, punteros liberados y politica de un anuncio probados; falta validacion movil |
| 2026-08-12 | Fase 10 | `npm test` + `npm run build` | Windows / Node 24 | Implementacion correcta | Tres skins basicas, rotacion diaria UTC, desbloqueo permanente por un anuncio, alternativa de 1,200 monedas, limite diario y persistencia protegida; falta validacion movil |
| 2026-08-13 | Fase 11 | `npm run test:crazygames` + TypeScript | Windows / Node 24 | Implementacion correcta | SDK v3 aislado por entorno, callbacks rewarded, muteAudio, eventos de carga/gameplay, Basic Launch, adblock, unfilled, cooldown, fallback y puente Data probados con SDK controlado; falta localhost oficial y Preview Tool |

## Decisiones pendientes controladas

Estas decisiones no bloquean las primeras fases y deben resolverse en el punto indicado:

- Fase 11/12: primer portal que recibira una build publica con monetizacion.
