# Fase 11.5 - Plan de intervencion multiplataforma

Esta hoja convierte las criticas de PC y claridad de gameplay en un proceso verificable. No se implementa como un paquete unico: cada bloque genera una build jugable, recibe observaciones y se estabiliza antes de avanzar.

La validacion fisica posterior confirmo una brecha real de mouse, drag y rendimiento
en pantallas grandes. La remediacion que conserva touch y extrae perfiles modulares
se ejecuta en [`DESKTOP_INPUT_PROFILE_PLAN.md`](DESKTOP_INPUT_PROFILE_PLAN.md). Esa
hoja extiende la salida 11.5G; no reemplaza las entregas A-F ya implementadas.

## Politica de avance sin PC fisico

La implementacion no se detiene si temporalmente el usuario y sus probadores no pueden acceder a un PC. En ese caso:

- se implementa el bloque completo con arquitectura y valores conservadores;
- se prueban mouse sintetico, cambio de puntero y viewports desktop mediante tests;
- se validan 16:9, ultrawide y escalas comunes de navegador por calculo/layout;
- se ejecutan regresiones touch, audio, score, FLOW y rendimiento disponibles;
- se marca la sensacion fisica de mouse como `VALIDACION DIFERIDA`;
- se continua inmediatamente con la siguiente entrega.

La deuda de validacion se conserva en una lista unica y se prueba cuando el usuario recupere acceso a su PC. Solo la salida de 11.5G, CrazyGames Preview y cualquier lanzamiento quedan bloqueados por esa deuda; las entregas A-F no.

## Problemas confirmados

1. Touch se siente bien, pero mouse no transmite la misma calidad de movimiento y ritmo.
2. El combo existe en HUD, pero obliga a apartar la vista de los objetivos.
3. Bien, Perfect y Miss no tienen un lenguaje sonoro suficiente.
4. Perder la ultima vida no tiene una transicion o pantalla de derrota con peso propio.
5. El jugador no percibe perifericamente que esta a un fallo de terminar.
6. FLOW puede expirar sin error y su ruptura se presenta como si el jugador hubiera fallado.

## Decisiones de diseno iniciales

### Reglas compartidas

- Score, ventanas Perfect/Bien, vida, beatmap y orden de notas siguen siendo una sola fuente de verdad.
- Los perfiles de dispositivo solo cambian presentacion espacial, asistencia, patrones habilitados y feedback de puntero.
- Nunca se decide `mobile` usando solamente el ancho de pantalla; se observa el puntero activo (`mouse`, `touch`, `pen`).

### FLOW propuesto

```text
NORMAL --aciertos suficientes--> FLOW x2
FLOW --Perfect--> conserva FLOW + progreso SUPER
FLOW --Bien--> conserva FLOW
FLOW --Miss--> NORMAL + ruptura
SUPER FLOW --Perfect--> conserva SUPER FLOW
SUPER FLOW --Bien--> FLOW + degradacion controlada
SUPER FLOW --Miss--> NORMAL + ruptura
pausa/transicion/anuncio/tiempo--> ningun cambio
```

Se elimina el temporizador como causa de salida. Esto alinea la fantasia de dominio con la responsabilidad del jugador: si no hubo error, el juego no comunica castigo.

Como FLOW puede durar mas, se revisan score y economia. Las monedas ya no dependen directamente del score, pero records y misiones si pueden necesitar normalizacion o versionado de balance.

### Estado de peligro

`Danger` se activa exactamente cuando `lives === 1` y el siguiente Miss produciria game over. Su representacion debe permanecer en la periferia:

- marco respirando con baja opacidad;
- vida final claramente marcada;
- pulso grave discreto y sincronizado, no una alarma continua;
- reduccion automatica del efecto durante SUPER FLOW para no saturar;
- apagado inmediato cuando la vida sube por un Perfect o revive.

### Derrota

La derrota no es el Resultado. Es un puente breve entre gameplay y decisiones:

```text
ultimo Miss -> ruptura audiovisual 300-600 ms -> DEFEAT
DEFEAT -> revivir / reintentar / playlist / ver resultado
```

Resultado conserva score, estrellas y monedas. Derrota explica el fallo y ofrece la siguiente accion; ambos estados no deben registrar la partida dos veces.

## Secuencia de trabajo

### Entrega 1 - Instrumentacion y desktop

- [x] Registrar puntero activo, viewport, distancia recorrida y resultado de cada nota solo en desarrollo.
- [x] Crear `InputGameplayProfile` y calculo de playfield independientes de `TouchTuning`.
- [x] Limitar ancho jugable en desktop y crear cursor/estela procedurales.
- [x] Generar tres variantes de alcance/densidad espacial desktop para prueba humana.

Estado: `IMPLEMENTADA / VALIDACION FISICA DIFERIDA`. `balanced` queda activo por defecto; las variantes se comparan con `?mouseReach=compact` y `?mouseReach=expansive` cuando exista acceso a PC.

Validacion diferible: el usuario, su hermana u otro probador de PC compara builds y describe precision, cansancio, vacios, velocidad y lectura. Su ausencia no detiene la Entrega 2.

### Entrega 2 - Combo focal

- [x] Crear presentador de combo anclado al ultimo impacto.
- [x] Agregar hitos perifericos y anticipacion a FLOW.
- [x] Medir solapamiento con hasta tres notas visibles futuras y reutilizar una sola instancia visual.

Estado: `IMPLEMENTADA / VALIDACION FISICA DIFERIDA`. El algoritmo fue probado en movil vertical, movil horizontal y desktop; la lectura periferica durante una partida completa se acumula para 11.5G.

Validacion necesaria: completar una cancion sin consultar el HUD y poder decir aproximadamente si el combo esta creciendo o se rompio.

### Entrega 3 - Audio reactivo

- [x] Introducir buses `music`, `feedback` y `platform master`.
- [x] Sintetizar Perfect/Bien/Miss, combo roto y ultima vida con Web Audio.
- [x] Elevar Perfect/Bien y añadir firmas ascendentes exclusivas para FLOW y SUPER;
  cada activacion sustituye el juicio normal para limitar la mezcla a tres voces.
- [x] Aplicar duck/filtro mediante automatizaciones con retorno garantizado; retirar distorsion tras prueba fisica negativa y reforzar un sonido de error propio.
- [x] Limpiar voces y automatizaciones en pausa, mute, anuncio, stop y cambio de cancion.

Estado: `IMPLEMENTADA / AJUSTE AUDITIVO EN CURSO`. La primera escucha detecto que distorsionar la musica parecia un problema tecnico y se elimino WaveShaper. Danger/Miss ya fueron aprobados en PC y movil; queda confirmar el nuevo nivel de aciertos y las firmas FLOW/SUPER.

Validacion necesaria: reconocer juicios con ojos cerrados sin que la musica pierda tempo o resulte molesta.

### Entrega 4 - Danger y FLOW semantico

- [x] Añadir estado Danger derivado de vidas, no duplicado en el modelo.
- [x] Reescribir `FlowModel` sin expiracion temporal ni actualizacion desde el frame.
- [x] Mantener eventos distintos para degradacion, ruptura y activacion.
- [x] Confirmar que monedas/estrellas usan precision y no score; diferir medicion de records y frecuencia FLOW a partidas completas.

Estado: `IMPLEMENTADA / VALIDACION FISICA DIFERIDA`. La maquina de estados y Danger estan probados; contraste, fatiga y balance x2/x4 se acumulan para 11.5G.

Validacion necesaria: dejar pasar tiempo/transiciones sin notas y confirmar que FLOW no cambia; Bien y Miss deben producir respuestas inequivocamente distintas.

### Entrega 5 - Derrota

- [x] Crear transicion y `DefeatOverlay` modular.
- [x] Resolver ownership de registro de partida y anuncios mediante una sola finalizacion en `GameApplication`.
- [x] Integrar revive desde checkpoint sin repetir impacto o recompensa.
- [x] Agregar acciones accesibles con mouse y touch: revive, reintento, playlist y resultado.

Estado: `IMPLEMENTADA / VALIDACION FISICA DIFERIDA`. Se verificaron seis viewports, politica de anuncio unico y guard de finalizacion; quedan recorridos manuales por fase, cancelacion real y revive real para 11.5G.

Validacion necesaria: probar derrota en Lectura, Impulso y Climax, con y sin anuncio, y verificar una sola recompensa/estadistica.

### Entrega 6 - Balance y regresion

- [~] Ejecutar matriz mouse/touch/pen y tres dificultades: reglas aprobadas, partidas fisicas pendientes.
- [ ] Comparar build anterior y nueva en movil para proteger la sensacion aprobada.
- [ ] Medir FPS, latencia percibida, misses, combo maximo, uso de FLOW y reintentos fisicamente.
- [x] Congelar arquitectura; cualquier cambio restante de 11.5G sera balance de valores o correccion demostrada.

Estado: `REGRESION AUTOMATICA APROBADA / VALIDACION FISICA PENDIENTE`. Ocho viewports, 24 canciones, 72 beatmaps, tres dificultades, FLOW, Danger, derrota y WAV pasaron. La inspeccion visual por navegador no estuvo disponible. Seguir [`PHASE_11_5_VALIDATION_CHECKLIST.md`](PHASE_11_5_VALIDATION_CHECKLIST.md) antes de cerrar 11.5.

## Evidencia que pediremos a los probadores

Cada prueba debe indicar:

- dispositivo, navegador, resolucion y metodo de entrada;
- dificultad y cancion;
- si los objetivos se sienten muy separados, faciles, lentos o impredecibles;
- si combo, peligro y FLOW se comprenden sin mirar arriba;
- si Miss y derrota se entienden por sonido;
- si algun efecto tapa notas, cansa la vista o molesta al oido;
- si desea reintentar y entiende las opciones posteriores a perder.

Se prefieren observaciones concretas sobre adjetivos generales. Ejemplo util: `en 1920x1080 mover de extremo a extremo rompe el ritmo dos veces por fase`; ejemplo insuficiente: `se siente raro`.

## Deuda de validacion acumulada

Cuando no exista acceso a PC, cada entrega agregara aqui sus casos manuales pendientes. Al disponer de PC se ejecutaran juntos, se corregiran valores y se repetira la regresion movil. Esta deuda nunca se interpretara como funcionalidad incompleta mientras tests y build sean correctos, pero impide declarar la fase apta para lanzamiento.

## Condiciones que bloquean el lanzamiento

- Desktop sigue siendo claramente inferior a touch.
- FLOW cambia sin una nota evaluada.
- El estado Danger parece un error ya cometido.
- Combo requiere mirar fuera del playfield.
- Los efectos de audio alteran el reloj o sobreviven a pausa/cambio de escena.
- Derrota o revive registran dos veces monedas, eventos o records.
- La mejora de PC degrada hitboxes, rendimiento o tacto en movil.
