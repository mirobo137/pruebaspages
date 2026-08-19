# SUPERFLOW - Roadmap de retencion, contenido y release

Plan activo para esta sesion: mejorar el retorno diario, ampliar el contenido
cosmetico procedural, reorganizar la playlist y dejar una build candidata mas
preparada para CrazyGames/Poki.

Actualizado: 2026-08-18.

## Objetivo de la sesion

Conseguir que el jugador tenga tres motivos claros para volver:

1. reclamar una recompensa diaria gratuita;
2. completar y combinar nuevos componentes visuales;
3. encontrar una cancion y comenzar una partida sin sentirse perdido en el menu.

Todo debe funcionar sin backend y sin SDK real. La cuenta local es la fuente de
progreso durante esta etapa; CrazyGames y Poki se validaran despues en sus entornos
oficiales.

## Principios que no se deben romper

- Las recompensas son cosmeticas o monedas; nunca cambian timing, hitboxes, vidas,
  dificultad ni asistencia de mouse/touch.
- La ruleta diaria solo puede resolverse una vez por dia UTC y no puede cambiar su
  resultado al recargar, cerrar o cambiar de escena.
- Un premio duplicado se convierte en monedas de compensacion, nunca desaparece.
- La aleatoriedad debe ser reproducible y auditable sin permitir rerolls locales.
- La interfaz debe conservar scroll, cancion, dificultad y preview seleccionados.
- Cada fase debe mantener una ruta sin anuncios y no depender de SDK.
- No se agregan imagenes externas: los nuevos temas, fondos y barras se dibujan con
  PixiJS y se registran como datos modulares.

## Arquitectura objetivo

```text
DailyRouletteEngine (puro y determinista)
        |
ProgressionStore + LocalProgressStorage
        |
DailyRouletteScene / DailyRewardPanel
        |
ThemeCatalog + ThemeCollection + CustomTheme
        |
MenuScene + MenuLayout v2 + SongList
        |
release checks, build y adaptadores simulados
```

La ruleta no debe conocer PixiJS. La escena solo presenta el estado y solicita una
resolucion al motor. El inventario existente sigue siendo el responsable de validar
temas, componentes desbloqueados y equipamiento.

## Fase R1 - Ruleta diaria gratuita

Objetivo: crear un habito diario sin anuncios obligatorios.

Estado: completada en esta sesion. La siguiente fase pendiente es R2.

- [x] Definir `DailyRouletteReward` y una tabla de pesos versionada.
- [x] Incluir monedas, componentes cosmeticos y una recompensa rara de tema completo.
- [x] Añadir proteccion contra duplicados: convertir un componente repetido en
  monedas de compensacion.
- [x] Guardar `dayKey`, resultado, estado `claimed` y `opportunityId` derivado en el progreso.
- [x] Hacer la resolucion determinista por dia y persistirla antes de animar.
- [x] Crear una escena o panel aislado con estados: disponible, girando, revelado y
  ya reclamado; el almacenamiento tolera errores sin detener el juego.
- [x] Mostrar la recompensa despues del giro, sin reroll.
- [x] Añadir telemetria local acotada: visible, abierta, reclamada y tipo de premio.
- [x] Integrar un acceso discreto desde la pantalla principal.

Compuerta R1: pruebas de rollover UTC, una sola reclamacion, recarga, duplicados,
checksum/migracion y recompensa de todos los tipos.

## Fase R2 - Expansion de skins y fondos modulares

Objetivo: hacer que los premios diarios y semanales tengan variedad visible.

Familias modulares previstas:

- paleta de objetivos;
- aro de aproximacion;
- estela de arrastre;
- efecto de Perfect;
- fondo FLOW;
- fondo SUPER FLOW;
- visualizador/fondo de barras musicales.

Trabajo:

- [x] Añadir al menos cuatro temas completos procedurales nuevos con identidad
  visual distinta.
- [x] Añadir opciones independientes de fondos FLOW/SUPER FLOW y visualizador de
  barras para combinarlas desde `MI SKIN`.
- [x] Asignar origen y rareza a cada componente: diario, semanal, monedas o evento.
- [x] Mostrar en la ruleta y en el evento una previsualizacion del premio real.
- [x] Mantener un solo slot personalizado y conservar la regla de combinacion libre.
- [x] Añadir estados visuales de nuevo, equipado, bloqueado y repetido/compensado.
- [x] Verificar que todos los temas resuelven con fallback al tema predeterminado.

Estado R2: completada en esta sesion. La ruleta muestra antes del giro una vista
procedural del tema completo o del componente que corresponde al resultado diario;
Coleccion y MI SKIN mantienen la previsualizacion y combinacion completa.

Compuerta R2: cada componente nuevo se resuelve en preview/gameplay, se guarda tras
recargar y no modifica ninguna regla de juego.

## Fase R3 - Playlist y menu principal v2

Objetivo: reducir saturacion y hacer evidente que el flujo es elegir, escuchar,
configurar dificultad y jugar.

Jerarquia propuesta:

```text
Barra superior: SUPERFLOW | recompensa diaria | evento | monedas
        |
Tarjeta de cancion seleccionada: portada procedural, nombre, BPM, duracion,
estrellas, mejor combo y preview de 5 segundos
        |
Playlist desplazable: categorias y canciones, con una sola accion primaria por fila
        |
Dificultad: tres tabs compactas con estrellas y record de la cancion
        |
Barra inferior: JUGAR como accion principal; coleccion como accion secundaria
```

Trabajo:

- [x] Reorganizar `MenuScene` en zonas visuales claras sin duplicar informacion.
- [x] Convertir la cancion seleccionada en el foco principal de la pantalla mediante
  el panel de progreso contextual.
- [x] Mantener evento y ruleta como accesos compactos con badge de recompensa pendiente.
- [x] Reducir texto auxiliar y mostrar estrellas/mejor puntuacion dentro de cada
  pestaña de dificultad.
- [x] Mantener categorias, scroll, preview de 5 segundos y preferencias persistentes.
- [ ] Diseñar una variante vertical y otra horizontal en `MenuLayout`.
- [ ] Mantener el boton JUGAR siempre visible y accesible en movil.
- [ ] Añadir estados vacio, carga, audio no disponible y cancion bloqueada.

Compuerta R3: pruebas automatizadas en las resoluciones existentes, sin solapamientos,
sin perdida de seleccion y con el mismo flujo en touch/mouse.

Estado R3.2: implementada. Sin seleccion, la playlist gana espacio y oculta
dificultad, records y `JUGAR`; al seleccionar una fila aparece el contexto completo.
Las filas incorporan profundidad procedural y el layout tiene pruebas para ambos
estados. Falta validacion visual en GitHub Pages antes de cerrar R3.

## Fase R4 - Preparacion de release sin SDK real

Objetivo: dejar una build candidata que pueda subirse mas tarde a los Preview Tools.

- [ ] Crear un comando agrupado de release que ejecute contratos, progreso, eventos,
  menu, skins, ads simulados, regresion, build y limite del bundle.
- [ ] Verificar rutas de assets y ausencia de 404 en GitHub Pages.
- [ ] Revisar carga inicial, audio bloqueado por autoplay y fallback de SFX.
- [ ] Revisar que los SDK reales permanezcan desactivados fuera de sus plataformas.
- [ ] Revisar textos de privacidad, uso de almacenamiento local y telemetria neutral.
- [ ] Preparar checklist de subida para CrazyGames y Poki, sin marcarlo aprobado aun.
- [ ] Actualizar handoff y hoja de trabajo con los cambios de esta sesion.

Compuerta R4: `npm test`, `npm run build`, `git diff --check` y una revision de
`dist` correctos. La aprobacion visual en PC y la prueba de SDK quedan explicitamente
pendientes para otra sesion.

## Orden de implementacion en esta sesion

1. R1: contrato, motor, progreso, panel y pruebas de ruleta.
2. R2: nuevos temas y componentes de fondos/barras.
3. R3: rediseño de playlist con pruebas de layout.
4. R4: release check, documentacion y build.

## Fuera de alcance inmediato

- anuncios para obtener tiradas extra;
- backend, cuentas o sincronizacion remota;
- ranking online;
- cambiar Musical v2 o promover chroma v3;
- SDK real de CrazyGames o Poki;
- crear multiples slots de skins personalizadas.

Esas tareas se evaluaran despues de que R1-R4 pasen sus compuertas y exista una
prueba fisica de escritorio disponible.
