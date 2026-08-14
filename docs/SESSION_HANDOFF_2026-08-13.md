# Traspaso de sesion - 2026-08-13

Este documento permite continuar SUPERFLOW desde otra PC sin reconstruir el
contexto de la sesion. La rama activa es `main` y el remoto es
`origin = https://github.com/mirobo137/pruebaspages.git`.

## Resultado de la sesion

Se implemento y calibro un perfil de juego para PC que conserva intacta la
experiencia tactil. El problema inicial tenia dos causas independientes:

1. Chrome estaba usando `Microsoft Basic Render Driver`, lo que producia unos
   13 FPS en fullscreen. Con la RTX 4060 Ti se midieron 60 FPS estables.
2. El campo completo y el trazado exacto de los drags exigian demasiado recorrido
   con mouse, incluso cuando el render funcionaba correctamente.

El resultado aprobado usa un campo desktop centrado de hasta 820x680, recorridos
deterministas limitados por dificultad y asistencia direccional exclusiva para los
drags de mouse. Touch y pen conservan el trazado original.

El usuario aprobo fisicamente:

- PC con mouse en Facil, Medio y Dificil;
- una finalizacion real de Dificil con el modelo espacial v3;
- movil tactil despues de introducir la asistencia exclusiva de mouse;
- fullscreen acelerado a 60 FPS y fallback automatico `minimal` por software;
- sonidos reforzados de Perfect/Bien y firmas distintas de FLOW/SUPER FLOW.

## Arquitectura implementada

### Rendimiento y fullscreen

- `src/rendering/RenderResolutionPolicy.ts`: presupuesto preventivo de pixeles.
- `src/rendering/AdaptivePerformanceController.ts`: degradacion sostenida
  `full -> reduced -> minimal -> 0.75 -> 0.5`.
- `src/rendering/RendererDiagnostics.ts`: deteccion de backends por software.
- `RhythmBackground` y `JuiceSystem` responden a la calidad visual sin cambiar
  hitboxes, coordenadas, timing ni score.
- En DPR 1 se conserva la nitidez nativa mientras sea viable; la primera prueba
  que reducia integralmente el canvas fue descartada porque pixelaba el texto.

### Perfiles de entrada

- `InputModeDetector`, `GameplayInteractionProfile`,
  `InteractionProfileCatalog`, `PlayfieldLayout` y `PointerAssistance` separan
  deteccion, geometria y asistencia.
- El perfil se decide por el puntero real, no solo por el ancho de pantalla.
- Un gesto bloquea su perfil hasta terminar, evitando cambios a mitad de drag.
- Score, vidas, FLOW, recompensas y progreso siguen compartidos entre perfiles.

### Campo y recorrido de mouse

- Variante aprobada: `balanced`, campo maximo 820x680.
- `TravelBudget` limita distancia entre cabezas, cambio angular y longitud de drag.
- La proyeccion es determinista; se retiro `Math.random()` de la colocacion activa.
- Presupuestos mouse:

| Dificultad | Velocidad cabeza | Distancia cabeza | Drag maximo |
|---|---:|---:|---:|
| Facil | 900 px/s | 340 px | 340 px |
| Medio | 1,000 px/s | 380 px | 360 px |
| Dificil | 1,100 px/s | 420 px | 380 px |

### Drag asistido de mouse

La primera propuesta `PRESIONA - MANTEN - SUELTA` con checkpoints y liberacion
exacta fue probada y rechazada: exigia leer durante una nota rapida y concentro
10 fallos en 15 drags.

La politica final `mouse-assisted`:

- fija Perfect/Bien al adquirir la cabeza;
- pide mantener el boton y seguir la direccion general;
- permite cortar curvas dentro de un corredor amplio;
- limita el avance por movimiento real del puntero, por lo que un clic final no
  puede completar la nota sin recorrido;
- completa automaticamente al 84%; no exige soltar exactamente en el destino;
- no muestra texto ni checkpoints intermedios para mouse.

Touch y pen continúan con la politica canonica `trace`. En la sesion aprobada hubo
19 drags de mouse y cero fallos de recorrido, destino o liberacion.

### Equidad y diagnostico

- Version actual: `spatial-v3-hard-mouse-acquisition`.
- Progreso: `shared-across-input-profiles`.
- Solo mouse+Dificil recibe +20 px de adquisicion de cabeza. No cambia ventanas
  ritmicas ni afecta mouse Medio, touch o pen.
- `GameplayInputTelemetry` registra frames, recorrido, pulsaciones vacias,
  resultados, causas de Miss, demanda entre notas y longitud de drags.
- `window.__superflowDiagnostics` expone la partida actual en desarrollo.
- `window.__superflowInputComparison` agrega resultados locales por perfil,
  version espacial y dificultad.
- `song_finished` incluye contexto tecnico, pero la economia y los records siguen
  siendo compartidos.

Comandos de consola utiles:

```js
copy(JSON.stringify(window.__superflowDiagnostics, null, 2))
copy(JSON.stringify(window.__superflowInputComparison, null, 2))
```

### Audio reactivo

- El unico sample externo es `src/audio/assets/audio/sfx/miss.wav`.
- Perfect, Bien, ruptura, derrota, FLOW y SUPER FLOW se generan con Web Audio en
  `src/audio/ReactiveAudioFeedback.ts`; no dependen de assets ni licencias externas.
- Perfect y Bien fueron reforzados porque la mezcla original era demasiado baja.
- FLOW usa tres capas ascendentes y SUPER FLOW cuatro capas mas altas y brillantes.
- Una activacion FLOW/SUPER sustituye el sonido normal de esa nota para evitar
  apilar demasiadas voces.
- El usuario aprobo fisicamente la mezcla final. MISS y la musica no fueron
  aumentados durante el ultimo ajuste.

## Evidencia fisica principal

| Perfil/modelo | Dificultad | Resultado |
|---|---|---|
| mouse / spatial-v2 | Facil | 1/1 completa, 89.3% precision, combo 45, 2 Miss |
| mouse / spatial-v2 | Medio | 2/2 completas, 78.8% precision media, combo 29 |
| mouse / spatial-v3 | Dificil | 7 intentos, 1 completo, 73.5% precision media, combo 26.9 |

Una partida representativa de Dificil v3 produjo 38 Perfect, 22 Bien y 9 Miss a
60 FPS. El usuario la describio como exigente pero completable si se concentra.
No se debe seguir facilitando Dificil sin nueva evidencia: los fallos restantes son
principalmente de timing, no de geometria imposible.

## Pruebas y validadores

Se añadieron validadores para rendimiento adaptativo, resolucion, perfiles,
equidad, presupuesto espacial, politica de drag y audio reactivo. `package.json`
los integra en la suite.

Despues del ultimo balance de FLOW/SUPER pasaron primero:

```text
npm run test:reactive-audio
npx tsc -b --pretty false
```

Finalmente se ejecuto la validacion completa sobre el estado que queda listo para
Git:

```powershell
npm test
npm run build
```

Resultado: ambas ordenes finalizaron con codigo 0. Pasaron todos los validadores,
las 24 canciones, los 72 beatmaps, el build de Vite y el presupuesto del bundle
(`477.34 kB` para el chunk principal generado en esta ejecucion).

En este equipo Vite/esbuild puede necesitar ejecución fuera del sandbox para leer
`vite.config.ts`; ese error de acceso no representa un fallo del proyecto.

## Entorno local conocido

El servidor Vite se inicio expuesto a la LAN. En esta PC:

- PC: `http://127.0.0.1:5173/`
- movil en la misma red: `http://192.168.100.11:5173/` (la IP puede cambiar)

`http://localhost:5173/` llego a resolver hacia otro servicio IPv6 y respondio 404;
usar `127.0.0.1` evita esa ambiguedad. Para iniciar otra vez:

```powershell
npm run dev -- --host 0.0.0.0
```

## Documentos actualizados

- `docs/DESKTOP_INPUT_PROFILE_PLAN.md`: plan D0-D7 y evidencia por etapa.
- `docs/desktop-baselines/2026-08-13-pc.md`: diagnosticos y sesiones fisicas.
- `docs/PHASE_11_5_MULTIPLATFORM_POLISH.md`: arquitectura y cierre 11.5.
- `docs/PHASE_11_5_VALIDATION_CHECKLIST.md`: matriz humana restante.
- `docs/MUSIC_INTELLIGENCE_ROADMAP.md`: beatmap canonico y proyeccion espacial
  versionada para que Music Intelligence no duplique mapas por dispositivo.
- `docs/PROJECT_CONTEXT.md`, `GAME_OBJECTIVES.md` y
  `LIVEOPS_IMPLEMENTATION_PLAN.md`: decisiones sincronizadas.

## Pendientes exactos para la proxima sesion

1. Probar captura/liberacion del mouse fuera del canvas o iframe durante un drag.
2. Formalizar la matriz touch completa: Facil/Medio/Dificil en vertical y horizontal.
3. Completar rutas de derrota en las tres fases: Resultado, Reintentar y Playlist.
4. Probar revive exitoso, cancelado y no disponible dentro del SDK/portal.
5. Ejecutar CrazyGames Preview y Poki Inspector despues de cerrar 11.5G.
6. Marcar 11.5G completada, guardar una revision estable y comenzar Music
   Intelligence M0 siguiendo el roadmap adaptado.

No iniciar todavía generación de beatmaps distintos para PC y movil. Music
Intelligence debe producir intención musical/espacial canonica y pasarla por el
perfil versionado al jugar.
