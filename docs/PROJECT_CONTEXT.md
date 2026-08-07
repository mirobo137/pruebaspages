# Contexto permanente del proyecto

Este documento es la referencia de trabajo para cualquier cambio futuro. Si una propuesta contradice estas decisiones, primero se debe justificar y actualizar este documento.

## Objetivo del producto

Crear un juego casual de ritmo y precision para movil y navegador de escritorio. El jugador escucha una cancion, anticipa objetivos que aparecen en pantalla y los resuelve con toques o deslizamientos. El juego debe ser facil de entender en segundos, satisfactorio de jugar en sesiones cortas y suficientemente claro para mejorar con cada intento.

El primer destino de pruebas es GitHub Pages. Cuando el nucleo sea solido, se preparara una version web para portales como CrazyGames o Poki. No se contempla Play Store ni App Store en esta etapa.

## Stack acordado

- TypeScript para la logica y los contratos de datos.
- PixiJS para renderizado, input tactil/mouse y ciclo visual.
- Vite para desarrollo local y bundle de produccion.
- Web Audio API para reproducir la pista y analizar volumen/frecuencias.
- Archivos JSON para catalogo y beatmaps versionados junto al juego.
- GitHub Actions + GitHub Pages para el despliegue de prueba.
- Persistencia local al inicio; sin backend, cuentas ni ranking online hasta validar la diversion.

## Arquitectura y responsabilidades

```text
src/
  main.ts                    Entrada del navegador
  app/                       Composicion de la aplicacion Pixi
  core/                      Contratos reutilizables, escenas y utilidades
  scenes/                    Flujo jugable y futuras pantallas
  game/                      Reglas, score, modos, timing y entidades de juego
    flow/                    Estado FLOW, carga, duracion y multiplicador
  ui/                        HUD, menus y resultados
  audio/                     Reproduccion, desbloqueo y analisis de audio
  content/                   Catalogos y carga de JSON
  input/                     Captura y utilidades de puntero/touch
  platform/                  Adaptadores para persistencia y portales
  progression/               Monedas y desbloqueos locales
public/assets/
  audio/                     Canciones distribuidas
  beatmaps/                  Eventos sincronizados por cancion
docs/
  PROJECT_CONTEXT.md         Este contrato de arquitectura
  GAME_OBJECTIVES.md         Vision viva y objetivos editables
scripts/
  generate-music-manifest.mjs  Automatizacion del catalogo musical
```

Reglas de modularidad:

1. `GameApplication` compone servicios y escenas; no contiene reglas de gameplay.
2. Una escena coordina el flujo, pero las reglas reutilizables viven en `src/game/`.
3. Las entidades visuales de Pixi solo representan estado y comportamiento visual/input inmediato.
4. Score, beatmaps, configuracion y persistencia deben poder probarse sin depender de una pantalla completa.
5. Audio, persistencia, progresion y APIs de CrazyGames/Poki se consumen mediante servicios o adaptadores; no se mezclan con las reglas del juego.
6. Los datos variables de canciones y niveles van en JSON, no escondidos dentro de clases grandes.
7. Cada cambio debe mantener `npm run build` funcionando antes de hacer push.
8. Preferir composicion y clases pequenas. Si una clase empieza a gestionar audio, menus, score y entidades a la vez, se debe dividir.
9. La precision touch tiene prioridad sobre el espectaculo: los efectos nunca deben bloquear eventos ni mover la zona logica sin actualizar su transformacion.
10. Las mecanicas de enganche deben premiar dominio y claridad. FLOW es una regla de gameplay independiente; HUD, fondo, efectos y haptics solo representan su estado.

## Mecanica central de FLOW

- Perfect carga 25 puntos y Bien carga 12; un fallo fuera de FLOW resta 30.
- Al llegar a 100, FLOW se activa automaticamente durante 8 segundos.
- Mientras esta activo, la puntuacion se multiplica por 2 y toda la presentacion cambia.
- Un fallo rompe FLOW de inmediato. Al expirar, el medidor vuelve a cero.
- Los valores viven en `src/game/config.ts` para balancearlos tras pruebas reales.

## Flujo de trabajo

En el ordenador:

```bash
git pull --rebase origin main
npm install
npm run dev
```

Para probar desde el movil en la misma Wi-Fi:

```bash
npm run dev -- --host 0.0.0.0
```

Antes de publicar cambios:

```bash
npm run build
git add .
git commit -m "descripcion breve del cambio"
git push origin main
```

El workflow de GitHub Pages vuelve a generar el catalogo musical en cada build. Para agregar una cancion desde el movil basta con subirla a `public/assets/audio/` y hacer pull en el ordenador; el nombre del archivo determina el `id` y el nombre esperado del beatmap. Si existe un beatmap con ese `id`, se carga automaticamente.

## Restricciones de producto

- Solo usar audio propio o con licencia compatible con distribucion web.
- Todos los recursos deben funcionar con rutas relativas bajo el subdirectorio de GitHub Pages.
- La interaccion debe funcionar con dedo y mouse; el teclado puede servir como apoyo de desarrollo.
- No introducir anuncios, monedas, backend o ranking online antes de que el bucle basico sea divertido y medible.
- Las monedas locales solo sirven como experimento de progresion; no se deben convertir en una barrera frustrante antes de tener varias canciones.
- El juego puede inspirarse en generos conocidos, pero la identidad visual, los nombres, el ritmo y las reglas deben evolucionar hacia una propuesta propia.
