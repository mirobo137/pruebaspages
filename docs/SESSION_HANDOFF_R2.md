# SUPERFLOW - handoff de sesion R2

Fecha: 2026-08-19

Este documento resume el estado de la sesion para continuar en otra PC.

## Antes de continuar en casa

Los cambios de esta PC todavia no tienen `push`. Para que aparezcan en la PC de
casa hay que consolidarlos primero desde esta PC:

```powershell
npm test
npm run build
git add .
git commit -m "feat: expand daily cosmetics and modular themes"
git push origin main
```

En casa:

```powershell
git pull origin main
npm install
npm run build
```

No se cambiaron canciones ni beatmaps en esta sesion. El build sigue usando las
23 canciones y 69 beatmaps oficiales bloqueados.

## Trabajo completado

### R1 - Ruleta diaria

- Recompensa gratuita una vez por dia UTC.
- Resultado determinista y persistente aunque se recargue la pagina.
- Premios de monedas, componentes y temas completos.
- Duplicados convertidos en monedas de compensacion.
- Acceso desde el menu principal.
- Persistencia local, telemetria y pruebas de rollover.

### R2 - Temas, skins y barras modulares

Se agregaron cuatro temas procedurales sin assets externos:

- `aurora-pulse` - Aurora Pulse.
- `magenta-circuit` - Magenta Circuit.
- `midnight-nebula` - Midnight Nebula.
- `lime-velocity` - Lime Velocity.

Cada tema modifica paletas, objetivos, aros, estelas, fondos FLOW/SUPER FLOW,
particulas y efectos sin tocar gameplay, timing ni hitboxes.

La personalizacion ahora tiene siete piezas independientes:

1. Objetivos.
2. Aro.
3. Estela.
4. Perfect.
5. Barras musicales.
6. Fondo FLOW.
7. Fondo SUPER FLOW.

El nuevo slot `BARRAS` permite combinar visualizadores procedurales:

- `spectrum-bars-line`: barras y linea.
- `spectrum-bars`: solo barras.
- `spectrum-columns`: columnas compactas.
- `spectrum-rings`: anillos reactivos.
- `spectrum-pulse`: pulso central reactivo.
- `none`: sin visualizador.

Los cuatro temas nuevos aparecen en Coleccion. Inicialmente quedan bloqueados y
se pueden conseguir mediante premios de la ruleta diaria; tambien se pueden ganar
componentes individuales y combinarlos en `MI SKIN`.

## Archivos importantes

- `src/customization/themes/modularThemes.ts`: definicion de los cuatro temas.
- `src/customization/ThemeCatalog.ts`: registro de temas.
- `src/customization/ThemeComponents.ts`: slots y composicion de `MI SKIN`.
- `src/game/effects/music-visualizers/SpectrumBarsMusicVisualizer.ts`: render de
  barras, anillos y pulso.
- `src/retention/DailyRouletteEngine.ts`: tabla de premios y determinismo diario.
- `src/scenes/CustomThemeScene.ts`: pantalla responsive de personalizacion.
- `docs/RETENTION_UX_RELEASE_ROADMAP.md`: roadmap activo.

## Validacion realizada

- `npm test` paso completo.
- `npm run build` paso completo.
- Bundle final: `493.06 kB`, limite `500 kB`.
- `npm run test:theme` paso.
- `npm run test:daily-roulette` paso.
- `npm run test:progress` paso.
- `npm run test:event` paso.
- `npm run test:layout` paso.
- `git diff --check` paso.

## Siguiente trabajo

1. Probar en movil desde GitHub Pages despues del push.
2. Abrir Coleccion y comprobar que aparecen los cuatro temas nuevos bloqueados.
3. Abrir `MI SKIN` y comprobar el nuevo boton `BARRAS`.
4. Conseguir o simular un premio de ruleta para comprobar `spectrum-columns`,
   `spectrum-rings` y `spectrum-pulse` en gameplay.
5. Despues iniciar R3: rediseño final del menu playlist.

El preview directo de la ruleta ya fue implementado: antes de girar se muestra el
tema completo o la combinacion actual con el componente que corresponde al premio
del dia.

## R3 - primera iteracion de playlist

- `TrackProgressPanel` ahora identifica la cancion seleccionada, BPM, dificultad,
  estrellas, mejor score, combo, precision e intentos.
- Las pestanas de Facil/Medio/Dificil muestran sus estrellas y mejor score sin
  cambiar de dificultad.
- El subtitulo del menu se redujo a una instruccion de una sola accion: tocar una
  pista para escuchar cinco segundos.
- Se conservaron scroll, categorias, preview, cancion seleccionada, dificultad y
  preferencias persistentes.

Validacion de esta iteracion: `npm run build`, `npm run test:layout`,
`npm run test:theme`, `npm run test:regression` y `git diff --check` pasaron.

Siguiente mejora sugerida: probar en movil y ajustar la altura de la tarjeta/lista
si alguna pantalla pequena se siente saturada antes de avanzar con R3.2.

## Regla de arquitectura

Todo lo visual debe seguir siendo procedural y modular. Los cosmeticos no pueden
modificar notas, dificultad, ventanas de timing, hitboxes, vidas, score ni la
asistencia especifica de mouse/touch.
