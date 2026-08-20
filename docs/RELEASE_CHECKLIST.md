# SUPERFLOW - checklist de candidato

## Comprobacion local

Desde la raiz del proyecto:

```powershell
npm install
npm run release:check
```

El comando agrupado ejecuta:

- suite completa de contratos y regresion;
- sincronizacion de contenido y build de produccion;
- limite de 500 kB para cada chunk JavaScript;
- `git diff --check`;
- validacion de `music-manifest.json`, audio, beatmaps, eventos, perfiles visuales
  y `miss.wav` dentro de `dist`.

## Prueba en GitHub Pages

1. Hacer push a `main` despues de revisar los cambios.
2. Esperar a que termine `Deploy to GitHub Pages`.
3. Abrir la URL publicada en movil vertical y horizontal.
4. En Playlist, confirmar que sin seleccion solo se ve la lista.
5. Tocar una cancion y confirmar preview, dificultad, records y `JUGAR`.
6. Cambiar de categoria, volver al menu y confirmar que se conserva la seleccion.
7. Abrir Diario, Evento, Coleccion y `MI SKIN`.
8. Jugar una pista y confirmar audio, `miss.wav`, FLOW/SUPER FLOW y resultado.

## Pendiente de plataformas

- prueba visual en PC y ajuste fino de mouse;
- CrazyGames Preview Tool con rewarded real;
- Poki Inspector con lifecycle y rewarded real;
- revision final de privacidad y licencias/evidencia comercial de las pistas;
- icono, miniatura, capturas y textos de publicacion.

No se debe marcar el release final solo con la comprobacion local: los SDK y la
validacion visual necesitan sus entornos reales.
