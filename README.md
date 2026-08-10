# Pixi Mobile Lab

Starter mínimo para experimentar con un juego móvil usando PixiJS, TypeScript y Vite.

## Organización del proyecto

La estructura separa la aplicación, las escenas, la lógica del juego, la interfaz, el audio y las integraciones de plataforma:

```text
src/app/             Arranque de PixiJS y ciclo principal
src/core/scene/      Contrato y gestor de escenas
src/scenes/          Escenas jugables y futuras pantallas
src/game/            Objetivos, puntuación y reglas
src/ui/              HUD y componentes visuales
src/audio/           Reproducción y análisis de música
src/content/         Catálogo de canciones y beatmaps
src/platform/        Persistencia local y futuras APIs de portales
public/assets/audio/ Canciones distribuidas con el juego
public/assets/beatmaps/ Eventos sincronizados con cada canción
```

## Añadir canciones

Coloca una versión comprimida de la canción en:

```text
public/assets/audio/mi-cancion.mp3
```

Los archivos de proyecto y WAV sin comprimir deben mantenerse fuera del bundle web. En cada build, `scripts/generate-music-manifest.mjs` escanea la carpeta y genera el catálogo automáticamente. Los beatmaps esperados para `mi-cancion.mp3` son:

```text
public/assets/beatmaps/mi-cancion/easy.json
public/assets/beatmaps/mi-cancion/medium.json
public/assets/beatmaps/mi-cancion/hard.json
```

Cada archivo define tres fases sobre un loop de 30 segundos. La partida completa dura 90 segundos y conserva puntuación, vidas, combo y FLOW al repetir el audio.

Para incorporar una canción subida desde el móvil:

1. Sube el archivo a `public/assets/audio/`.
2. En el ordenador ejecuta `git pull --rebase origin main`.
3. Crea o ajusta los tres beatmaps dentro de una carpeta con el mismo nombre base.
4. Verifica con `npm run build`, haz commit y push.

## Desarrollo local

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev
```

Para probarlo desde el móvil en la misma red Wi-Fi, ejecuta:

```bash
npm run dev -- --host 0.0.0.0
```

Después abre en el móvil la URL que muestre Vite usando la IP del ordenador, por ejemplo `http://192.168.1.20:5173`.

## Publicación en GitHub Pages

Cada `push` a `main` compila el juego y lo publica mediante GitHub Actions. Tras el primer despliegue, la URL tendrá esta forma:

```text
https://TU_USUARIO.github.io/NOMBRE_DEL_REPOSITORIO/
```

En el repositorio, revisa `Settings > Pages` y confirma que la fuente sea `GitHub Actions` si GitHub no la selecciona automáticamente.
