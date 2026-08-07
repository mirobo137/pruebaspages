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

## Añadir la canción

Coloca la versión comprimida de la canción en:

```text
public/assets/audio/prototype.mp3
```

Los archivos de proyecto y WAV sin comprimir deben mantenerse fuera del bundle web. El catálogo está en `src/content/MusicCatalog.ts`; cuando la canción esté lista actualizaremos allí su nombre, BPM y beatmap.

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
