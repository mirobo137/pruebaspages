# Plan independiente del perfil de PC

Esta hoja corrige la diferencia demostrada entre mouse y touch sin crear dos juegos,
dos beatmaps ni dos implementaciones de score. Se ejecuta antes de iniciar Music
Intelligence y funciona como plan de remediacion y cierre de la validacion 11.5.

## Estado

- Estado general: `EN VALIDACION FINAL`
- Fase activa: `D7 - Validacion fisica y cierre de 11.5`
- Siguiente accion: `Ejecutar suite/build final y completar rutas fisicas pendientes de 11.5G`
- Bloquea: cierre humano de 11.5G e inicio de Music Intelligence M0.
- No bloquea: pruebas aisladas del SDK que no dependan de aprobar la experiencia.

Estados permitidos:

- `[ ]` Pendiente.
- `[~]` En progreso. Solo puede existir una etapa en este estado.
- `[x]` Completada y aprobada.
- `[!]` Bloqueada con causa y evidencia registradas.

## Resultado esperado

Un mismo beatmap y una misma dificultad musical deben producir una experiencia
justa con mouse, touch y pen. Se comparten tiempo, ventanas de juicio, vidas,
score, FLOW, eventos y recompensas. Solo pueden variar la proyeccion espacial,
la asistencia fisica, el contrato del drag y la presentacion del puntero.

```text
Beatmap canonico
      |
reglas musicales compartidas
      |
perfil de interaccion activo
      +-- touch
      +-- mouse
      +-- pen
      |
resultado semantico Perfect / Bien / Miss
      |
ScoreModel + FlowModel compartidos
```

## Principios no negociables

1. No se crean escenas, beatmaps ni modelos de score separados por dispositivo.
2. El ancho de la ventana no decide por si solo el perfil; gobierna el puntero real.
3. Un gesto conserva el perfil con el que comenzo; nunca cambia a mitad de un drag.
4. El canvas puede ocupar todo el iframe aunque el campo logico sea mas pequeno.
5. Rendimiento grafico e interaccion son dominios distintos. Reducir resolucion no
   puede cambiar hitboxes, posiciones, timing o score.
6. El beatmap almacena intencion espacial normalizada, no pixeles de un dispositivo.
7. Una transformacion espacial es determinista para `beatmap + perfil + viewport`.
8. Ningun perfil obtiene ventanas musicales distintas para compensar mala geometria.
9. Economia y estrellas siguen compartidas. Un ranking futuro registra el perfil de
   entrada y no mezcla resultados competitivos hasta demostrar equivalencia.
10. Touch aprobado se protege como linea base; cada etapa incluye regresion movil.

## Arquitectura objetivo

```text
src/input/
  InputModeDetector.ts               Detecta mouse, touch o pen activo
  GameplayInteractionProfile.ts      Contratos declarativos
  InteractionProfileCatalog.ts       Valores mouse/touch/pen
  PlayfieldLayout.ts                 Campo logico por perfil y viewport
  SpatialProjector.ts                Normalizado -> posicion jugable
  TravelBudget.ts                    Distancia/tiempo, giro y descanso
  drag/
    DragInteractionController.ts     Ciclo compartido del gesto
    TouchTraceDragPolicy.ts          Comportamiento tactil aprobado
    MouseReleaseDragPolicy.ts        Presionar, seguir y soltar

src/rendering/
  RenderResolutionPolicy.ts          Presupuesto de pixeles independiente
```

`GameScene` coordina eventos y consume resultados; no decide valores concretos de
mouse o touch. `ScoreModel`, `FlowModel`, `BeatmapPlayer` y `TargetNode` no conocen
portales ni seleccionan perfiles.

## Contrato inicial del drag de mouse

1. Presionar la cabeza dentro de la ventana musical fija `Perfect` o `Bien`.
2. Mantener el boton primario mientras se recorren checkpoints en orden.
3. Permitir correccion tras una salida breve del corredor; el progreso no retrocede.
4. Al entrar al destino se muestra `SUELTA` y comienza una gracia breve.
5. Soltar dentro del destino completa la nota con el juicio fijado en la cabeza.
6. Soltar antes, cancelar el puntero o agotar el plazo produce `Miss`.
7. El tutorial `PRESIONA - MANTEN - SUELTA` aparece solo cuando el perfil mouse
   encuentra sus primeros drags y puede omitirse despues.

Touch conserva su gesto actual. Ambos resuelven la misma nota semantica `drag`;
el JSON no declara `mouseDrag` ni `touchDrag`.

## D0 - Linea base y diagnostico reproducible

Objetivo: separar lag, distancia, timing y dificultad del drag antes de balancear.

- [x] D0.1 Registrar navegador, resolucion CSS, DPR, GPU disponible y refresco.
- [x] D0.2 Medir frame time promedio, p95 y p99 en normal, FLOW y SUPER FLOW.
- [x] D0.3 Registrar distancia entre notas, tiempo disponible y recorrido del cursor.
- [x] D0.4 Clasificar fallos: tap, cabeza de drag, corredor, checkpoint, destino o release.
- [x] D0.5 Comparar la sesion mouse con la linea base touch fisica ya aprobada.
- [x] D0.6 Comparar `compact`, `balanced` y `quality=full` sin
  convertir esas variantes en la solucion definitiva.

Compuerta D0:

- existe al menos una sesion completa de mouse y una de touch;
- se puede distinguir si cada problema es de render, alcance o interaccion;
- los datos no contienen informacion personal y solo se emiten en desarrollo.

## D1 - Resolucion y rendimiento desacoplados

Objetivo: mantener la presentacion a pantalla completa sin renderizar una cantidad
innecesaria de pixeles en monitores grandes.

- [x] D1.1 Crear `RenderResolutionPolicy` con presupuesto suave de pixeles.
- [x] D1.2 Separar tamano CSS, resolucion interna y perfiles full/reduced/minimal.
- [x] D1.3 Conservar objetivos y HUD nitidos; permitir fondo/effects a menor costo.
- [x] D1.4 Evitar que DPR 2 convierta 1080p/4K en un framebuffer desproporcionado.
- [x] D1.5 Medir antes/despues en ventana pequena, 1080p y la pantalla grande disponible.
- [x] D1.6 Confirmar que reloj de audio, hitboxes y coordenadas no cambian.
- [x] D1.7 Crear perfil `minimal` sin fondos complejos, particulas ni blends prescindibles.
- [x] D1.8 Degradar por p95 sostenido, ignorando transiciones aisladas y pestanas ocultas.
- [x] D1.9 Detectar render por software conocido y activar compatibilidad inmediata.
- [x] D1.10 Validar fisicamente el fallback `minimal` y escalas 0.75/0.5.

Evidencia de implementacion:

- presupuesto preventivo suave de `4,200,000` pixeles internos con resolucion entre
  `0.5` y `2`, pero nunca inferior a `1` cuando el DPR es al menos `1`;
- 2566x1197 y 3440x1440 con DPR 1 conservan texto/HUD nativos; al superar el
  presupuesto, el perfil visual cambia dinamicamente a efectos reducidos;
- 1920x1080 con DPR 2 y 4K quedan limitados sin cambiar el tamano CSS;
- el canvas expone resolucion, pixeles y estado de limite para diagnostico;
- regresion completa, 72 beatmaps, typecheck y build de produccion aprobados;
- la primera reduccion integral a `0.9` produjo texto pixelado al entrar a fullscreen
  y fue descartada; el costo se reduce ahora en efectos, no en la nitidez base;
- el umbral de calidad automatica comparte el mismo presupuesto de `4,200,000`
  pixeles para impedir `budgetExceeded=true` junto con efectos `full`;
- la sesion local de 3,071,502 pixeles permanecio estable a 60 FPS, pero fullscreen
  a 4,466,880 pixeles cayo de forma sostenida a 13 FPS incluso con calidad `reduced`;
- el backend lento fue `Microsoft Basic Render Driver`; el fallback ahora entra
  directamente en `minimal` y escala 0.5, mientras renderizadores desconocidos se
  degradan por p95: `full -> reduced -> minimal -> 0.75 -> 0.5`;
- el modo de compatibilidad comunica que la nitidez puede mejorar activando la GPU;
  esta excepcion prioriza jugabilidad solo cuando el render nativo ya es inviable.

Compuerta D1:

- no existe lag perceptible atribuible al tamano del framebuffer;
- p95 de frame permanece dentro del presupuesto acordado durante SUPER FLOW;
- cambiar calidad o resolucion no altera resultados de una simulacion de input.

## D2 - Dominio modular de perfiles

Objetivo: extraer configuracion y politicas antes de cambiar el tacto aprobado.

- [x] D2.1 Separar dificultad ritmica de ergonomia de entrada.
- [x] D2.2 Crear perfiles declarativos `mouse`, `touch` y `pen`.
- [x] D2.3 Extraer calculo de campo a `PlayfieldLayout`.
- [x] D2.4 Extraer asistencia y compensacion de puntero de `TouchTuning`.
- [x] D2.5 Crear controlador de drag con politicas inyectables.
- [x] D2.6 Bloquear el perfil durante un gesto y permitir cambio solo entre notas.
- [x] D2.7 Reducir responsabilidades de `GameScene` sin modificar gameplay.

Evidencia D2:

- `InputModeDetector`, `InteractionProfileCatalog`, `PlayfieldLayout` y
  `PointerAssistance` tienen responsabilidades independientes;
- mouse, touch y pen conservan exactamente sus tolerancias anteriores;
- el drag almacena una politica `trace` inyectada y queda preparado para D5;
- un cambio de puntero durante un drag se aplica solo al terminar el gesto;
- regresion completa, 72 beatmaps, typecheck y build aprobados.

Compuerta D2:

- la regresion automatica pasa sin cambiar valores efectivos;
- touch produce la misma geometria, tolerancias y resultados que la build base;
- no existe un `if (mouse)` disperso en escenas, score, FLOW o progresion.

## D3 - Campo y proyeccion espacial de desktop

Objetivo: limitar alcance horizontal y vertical conservando pantalla completa.

- [x] D3.1 Definir campo desktop por ancho, alto, relacion y margen seguro.
- [x] D3.2 Mantener fondo, HUD y efectos perifericos fuera del campo de notas.
- [x] D3.3 Crear proyeccion determinista desde coordenadas normalizadas.
- [x] D3.4 Evitar saltos de posicion al redimensionar o cambiar puntero.
- [x] D3.5 Probar una matriz representativa de iframes CrazyGames y viewports
  Poki; la ejecucion dentro de cada portal se conserva para D7.
- [x] D3.6 Mantener touch sobre su campo aprobado actual.

Valores de partida para calibrar, no contrato final:

| Perfil | Ancho maximo | Alto maximo |
|---|---:|---:|
| Mouse compacto | 720 px | 620 px |
| Mouse balanceado | 820 px | 680 px |
| Mouse expansivo | 920 px | 740 px |
| Touch | Espacio seguro disponible | Espacio seguro disponible |

Evidencia automatica D3:

- `compact`, `balanced` y `expansive` producen 720x620, 820x680 y 920x740
  cuando el viewport dispone de espacio suficiente;
- viewports pequenos reducen el campo dentro de margenes seguros sin overflow;
- 10 viewports cubren desktop, ultrawide, 4K, movil vertical y movil horizontal;
- la proyeccion normalizada es determinista y los objetivos activos no se reproyectan
  durante resize o cambio de puntero;
- el diagnostico expone `playfield.left/top/width/height` para validacion fisica.

Compuerta D3:

- ningun tamaño desktop produce barridos vacios por usar toda la pantalla;
- objetivos, cursor y trayectorias comparten exactamente el mismo sistema espacial;
- resize y fullscreen no desplazan objetivos activos de forma injusta.

## D4 - Presupuesto de recorrido

Objetivo: hacer que distancia y curva sean realizables en el tiempo musical dado.

- [x] D4.1 Calcular presupuesto por tiempo entre eventos y perfil de entrada.
- [x] D4.2 Limitar distancia, cambio angular y longitud de drag por dificultad.
- [x] D4.3 Reservar descanso despues de cada drag antes de la siguiente cabeza.
- [x] D4.4 Proyectar una posicion imposible hacia la misma direccion/motivo valido.
- [x] D4.5 Mantener la transformacion determinista y comprobable sin `Math.random()`.
- [x] D4.6 Crear validador que ejecute cada mapa con mouse, touch y pen.

Presupuestos iniciales mouse:

| Dificultad | Velocidad cabeza | Distancia cabeza | Giro maximo | Drag maximo | Descanso post-drag |
|---|---:|---:|---:|---:|---:|
| Facil | 900 px/s | 340 px | 120 grados | 340 px | 160 ms |
| Medio | 1,000 px/s | 380 px | 135 grados | 360 px | 130 ms |
| Dificil | 1,100 px/s | 420 px | 150 grados | 380 px | 100 ms |

Evidencia automatica D4:

- los 72 beatmaps pasan distancia, velocidad, giro, drag y recuperacion en los tres perfiles;
- la cabeza posterior a un drag parte del destino esperado, no de la cabeza anterior;
- controles y final del drag se escalan juntos, conservando la forma del motivo;
- posiciones faltantes usan una semilla derivada de tiempo/fase y no `Math.random()`;
- touch y pen conservan sus coordenadas canonicas sin aplicar limites de mouse.

Compuerta D4:

- ningun evento exige velocidad o distancia superior al presupuesto del perfil;
- el patron musical sigue siendo reconocible despues de proyectarse;
- las mismas notas y tiempos existen en todos los perfiles.

## D5 - Interaccion de drag para mouse

Objetivo: convertir el drag en una instruccion clara y satisfactoria en PC.

- [x] D5.1 Implementar `MouseDirectionalAssistance` sin checkpoints obligatorios.
- [x] D5.2 Mantener el juicio musical en la cabeza y exigir movimiento fisico hacia delante.
- [x] D5.3 Retirar texto en tiempo real y checkpoints visuales del perfil mouse.
- [x] D5.4 Calibrar corredor amplio, avance por distancia real y umbral asistido.
- [x] D5.5 Probar avance, salto sin movimiento, salida de ruta, retroceso y pausa.
- [ ] D5.6 Confirmar captura y liberacion del puntero fuera del canvas/iframe.
- [x] D5.7 Mantener `TouchTraceDragPolicy` sin regresiones.

Valores de la segunda iteracion para prueba fisica:

- tolerancia extra mouse: 24 px y corredor direccional de 1.45x;
- finalizacion asistida mouse: 84%;
- avance maximo: 1.35 veces la distancia real recorrida sobre la longitud del drag;
- resolucion automatica al completar: no exige release exacto en el destino.

Compuerta D5:

- un jugador nuevo entiende el gesto sin explicacion externa;
- el principal fallo de mouse deja de ser soltar accidentalmente o no alcanzar 97.5%;
- la ayuda no permite resolver el drag con un clic final ni moviendose hacia atras.

## D6 - Equidad, progresion y telemetria

Objetivo: compartir progreso sin afirmar equivalencia competitiva no medida.

- [x] D6.1 Registrar `inputProfileId` y `spatialModelVersion` con cada resultado tecnico.
- [x] D6.2 Mantener monedas, estrellas, eventos y desbloqueos compartidos.
- [x] D6.3 Comparar precision, combo, recorrido, fallos y FLOW entre perfiles.
- [x] D6.4 Definir politica de rankings: separados por perfil o unidos solo tras evidencia.
- [x] D6.5 Evitar que cambiar de dispositivo invalide records locales existentes.
- [x] D6.6 Versionar cualquier cambio que altere comparabilidad de score espacial.

Contrato D6 implementado:

- version espacial actual: `spatial-v3-hard-mouse-acquisition`;
- perfiles de resultado: `mouse`, `touch`, `pen` o `hybrid`;
- progreso y records locales: compartidos entre perfiles, sin migracion destructiva;
- ranking competitivo futuro: separado por perfil y version espacial hasta demostrar
  equivalencia con muestras suficientes;
- comparacion local de desarrollo: `window.__superflowInputComparison`, agrupada
  por perfil, version espacial y dificultad, disponible al recargar o terminar;
- cada resultado tecnico incluye precision, combo, misses y causas, FLOW/SUPER,
  recorrido de puntero, pulsaciones vacias, demanda espacial y longitud de drag.

Compuerta D6:

- el mismo jugador no recibe una desventaja sistematica por usar mouse;
- el progreso viaja entre dispositivos sin perder datos;
- un resultado conserva suficiente contexto para compararlo honestamente.

## D7 - Validacion fisica y cierre de 11.5

Objetivo: aprobar la experiencia completa y retirar la deuda diferida.

- [x] D7.1 Ejecutar Facil, Medio y Dificil completos con mouse.
- [~] D7.2 Ejecutar las mismas rutas con touch despues de los cambios.
- [~] D7.3 Validar audio, Danger, FLOW, derrota, revive y anuncios.
- [~] D7.4 Probar ventana no fullscreen, fullscreen, resize y cambio de puntero.
- [x] D7.5 Ejecutar `npm test` y `npm run build` sobre la revision candidata.
- [~] D7.6 Completar `PHASE_11_5_VALIDATION_CHECKLIST.md` con evidencia humana.
- [ ] D7.7 Actualizar 11.5G a completada y registrar valores finales del perfil.
- [ ] D7.8 Despues de 11.5, ejecutar CrazyGames Preview y Poki Inspector para
  cerrar respectivamente 11.7 y 12.4; no confundir estas pruebas con D7.
- [ ] D7.9 Guardar una revision estable previa a Music Intelligence M0.

Compuerta final:

- mouse y touch se sienten intencionales, precisos y comparables;
- no hay lag dependiente del tamaño de pantalla ni drags ambiguos;
- ningun cambio desktop degrada el tacto aprobado en movil;
- 11.5 tiene aprobacion humana explicita en PC y movil;
- tests, build y validaciones de 24 canciones/72 beatmaps pasan;
- queda habilitado el inicio de Music Intelligence M0.

## Matriz minima

| Eje | Casos |
|---|---|
| Entrada | mouse, touch, pen sintetico, equipo hibrido |
| Dificultad | Facil, Medio, Dificil |
| Ventana | 821x462, 907x510, 1216x684, 1366x768, 1920x1080 |
| Estado | normal, FLOW, SUPER FLOW, Danger, derrota |
| Drag | horizontal, vertical, diagonal, curva simple, curva doble |
| Ciclo | inicio, pausa, resume, cambio de fase, revive, resultado |

## Registro de ejecucion

| Fecha | Etapa | Estado | Evidencia |
|---|---|---|---|
| 2026-08-13 | Planificacion | No iniciado | Problema fisico de PC confirmado; plan D0-D7 definido |
| 2026-08-13 | D0 instrumentacion | En progreso | Diagnostico en memoria para frame promedio/p95/p99, recorrido, demanda de drag, pulsaciones vacias y causas de Miss; prueba automatizada aprobada |
| 2026-08-13 | D0 equipo | En progreso | RTX 4060 Ti, 3440x1440 a 59 Hz, 16 procesadores logicos y 31.9 GiB registrados en `desktop-baselines/2026-08-13-pc.md`; faltan DPR y sesion jugable del navegador |
| 2026-08-13 | D0 sesion mouse 1 | En progreso | Balanced a 995x814, DPR 1 y 809,930 pixeles: drag casi imposible; evidencia apunta a ergonomia y no a carga del framebuffer. Snapshot completo y comparacion compact pendientes |
| 2026-08-13 | D0 diagnostico expandido | En progreso | 60 FPS estables en normal/FLOW/SUPER; 10 drags de 365.9 px promedio y 3 fallos `drag-release-early`. Contrato de finalizacion mouse confirmado como causa dominante; fullscreen pendiente para reproducir lag |
| 2026-08-13 | D0 calidad full | En progreso | 2,328 frames medidos a 60 FPS; p99 maximo 17.1 ms incluso en SUPER FLOW. Falta confirmar viewport/pixeles y si la sesion se sintio lenta |
| 2026-08-13 | D0 cierre | Aprobada | Local compact/full fluido a 3,071,502 pixeles reportados; lag de GitHub Pages no reproducido. Alcance y `drag-release-early` son causas demostradas; D1 queda preventivo y se habilita D2 despues de su compuerta |
| 2026-08-13 | D4 validacion fisica | Aprobada | Campo 820x680: viaje medio 226.7 px, maximo 375 px y velocidad maxima exactamente 1,000 px/s; drag medio 310.8 px y maximo 327.8 px. 60 FPS en los tres estados y ningun fallo de cabeza/deadline de drag |
| 2026-08-13 | D5 iteracion 1 | Rechazada | 10 de 15 drags fallaron: 6 fuera del destino y 4 por release temprano. Leer `PRESIONA-MANTEN-SUELTA` durante el gesto y exigir release exacto agregaron carga cognitiva y fisica |
| 2026-08-13 | D5 iteracion 2 | Pendiente de prueba fisica | Mouse usa asistencia direccional sin texto ni checkpoints: corredor +24 px ampliado 1.45x, umbral 84% y avance limitado por movimiento real. Touch conserva `trace`; `test:mouse-drag` aprobado |
| 2026-08-13 | D5 iteracion 2 fisica | Aprobada en gameplay | 19 drags observados: cero fallos de recorrido/release y solo 3 cabezas expiradas. 56/68 aciertos, SUPER FLOW alcanzado, 60 FPS y modo dificil descrito como jugable. Falta solo validar salida del canvas/iframe |
| 2026-08-13 | D5 regresion movil | Aprobada | Prueba fisica por LAN completada; el usuario confirma que la experiencia movil original funciona correctamente despues de la asistencia exclusiva de mouse |
| 2026-08-13 | D6 implementacion | Aprobada tecnicamente | Resultados versionados por perfil/modelo, comparador local, progreso comun y politica competitiva separada. `test:input-equity` cubre cambio de perfil, version, agregacion y records compartidos |
| 2026-08-13 | D7 inicio | En validacion fisica | Checklist consolidado con mouse Dificil jugable, drag aprobado, 60 FPS, fullscreen/ventana, fallback grafico y regresion movil. Quedan matriz completa por dificultad, audio/Danger, derrota/revive y salida de puntero |
| 2026-08-13 | D7 mouse Medio | Aprobada | 2 partidas completas: 78.8% precision media, combo 29, 10.5 FLOW, 5 SUPER, recorrido 60,135 px, distancia objetivo 231 px y velocidad maxima 1,000 px/s |
| 2026-08-13 | D7 mouse Facil | Aprobada | 1 partida completa: 89.3% precision, combo 45, 2 misses, 2 FLOW, 3 SUPER, velocidad maxima 388 px/s y drag medio 295.9 px |
| 2026-08-13 | D7 mouse Dificil | En diagnostico | 2 intentos sin completar: 47.8% precision, combo 4.5 y 3.5 misses antes de derrota. La demanda maxima 1,071.4 px/s respeta el presupuesto 1,100; falta snapshot de causas |
| 2026-08-13 | D7 ajuste Dificil | Pendiente de repetir | Snapshot: 4 `tap-timeout`, 4 pulsaciones vacias, 1 `drag-release-early`, 60 FPS. Se suma +10 px al radio de cabeza solo para mouse+Dificil; timing, score, viaje, otras dificultades y touch quedan intactos |
| 2026-08-13 | D7 Dificil +10 px | Mejora insuficiente | 52/61 aciertos, SUPER y 60 FPS; 8 `tap-timeout` coinciden con 8 pulsaciones vacias y 1/15 drags falla temprano. Se amplía a +20 px y se crea `spatial-v3-hard-mouse-acquisition` para no mezclar resultados |
| 2026-08-13 | D7 Dificil v3 +20 px | Balance aprobado / finalizacion pendiente | 60/69 aciertos, 38 Perfect, 22 Bien, SUPER y 60 FPS; 4 timeout, 4 taps tardios y 1 drag temprano. El jugador lo siente alcanzable si se concentra; no se aumenta mas la asistencia |
| 2026-08-13 | D7 matriz mouse | Aprobada | Facil y Medio completados al 100% de la muestra; Dificil v3 logra 1/7, 73.5% precision media, combo 26.9, 6 FLOW y 3 SUPER. Las tres dificultades tienen una finalizacion fisica |
