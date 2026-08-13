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

Coloca una versión comprimida de la canción en la carpeta de su precio:

```text
public/assets/audio/mi-cancion.mp3             Gratis
public/assets/audio/economicas/mi-cancion.mp3  400 monedas
public/assets/audio/selectas/mi-cancion.mp3    800 monedas
public/assets/audio/premium/mi-cancion.mp3     1,400 monedas
```

Los archivos de proyecto y WAV sin comprimir deben mantenerse fuera del bundle web. En cada build, `scripts/generate-music-manifest.mjs` escanea las cuatro ubicaciones y genera automáticamente el catálogo, categoría y precio. Los beatmaps esperados para `mi-cancion.mp3` son:

```text
public/assets/beatmaps/mi-cancion/easy.json
public/assets/beatmaps/mi-cancion/medium.json
public/assets/beatmaps/mi-cancion/hard.json
```

Cada archivo define tres fases sobre un loop de 30 segundos. La partida completa dura 90 segundos y conserva puntuación, vidas, combo y FLOW al repetir el audio.

Para incorporar una canción subida desde el móvil:

1. Sube el archivo a la carpeta de precio deseada dentro de `public/assets/audio/`.
2. En el ordenador ejecuta `git pull --rebase origin main`.
3. Ejecuta `npm run build`; si faltan, los tres beatmaps se crean automáticamente.
4. Prueba y ajusta esos beatmaps, después haz commit y push.

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

## Prueba del adaptador Poki

Poki no requiere guardar una clave de SDK en el proyecto. Para cargar su SDK HTML5
durante desarrollo:

```bash
npm run dev -- --host 0.0.0.0
```

Abre la URL local agregando `?portal=poki`, por ejemplo
`http://localhost:5173/?portal=poki`. GitHub Pages ignora este parámetro y nunca
carga el SDK publicitario.

La validación oficial se realiza así:

1. Ejecuta `npm run build`.
2. Abre [Poki Inspector](https://inspector.poki.dev/).
3. Carga la carpeta `dist` generada.
4. Revisa `gameLoadingFinished`, `gameplayStart`, `gameplayStop` y
   `rewardedBreak` en Event Log.
5. Prueba revivir, duplicar monedas y obtener la skin diaria.
6. Cambia a Mobile Mode y escanea el QR para repetir la prueba en el móvil.

## Telemetría de prueba y controles de lanzamiento

El juego conserva un máximo de 200 eventos técnicos en
`poki_ignore:superflow:telemetry:v1`. No registra información personal y un fallo
de almacenamiento o analítica nunca bloquea la partida.

En desarrollo o Preview se pueden probar los interruptores agregándolos a la URL:

```text
?rewardedAds=off
?rewardedRevive=off
?rewardedCoinDouble=off
?rewardedDailyCosmetic=off
```

Los parámetros pueden combinarse con `&`. No tienen efecto como overrides en los
canales de producción y GitHub Pages mantiene todos los anuncios deshabilitados.
