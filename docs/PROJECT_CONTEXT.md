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

## Estado actual de implementacion

El prototipo ya es jugable y compila para GitHub Pages. Actualmente incluye:

- Una cancion de prueba: `coffee-in-the-driveway`.
- Tres beatmaps separados en `public/assets/beatmaps/coffee-in-the-driveway/`.
- Dificultades Facil, Medio y Dificil con vidas, timing y tolerancia tactil propios.
- Menu con lista vertical de canciones desplazable por dedo o rueda, selector segmentado de dificultad y un solo boton Jugar.
- Partidas de 90 segundos divididas en Lectura, Impulso y Climax.
- Audio de 30 segundos precargado y decodificado con Web Audio, con reloj jugable continuo durante las tres fases.
- Objetivos `tap` y `drag`, con ventana `Perfect`, `Bien` y `Miss`.
- Vidas, combo, puntuacion, monedas locales y desbloqueo preparado para futuras canciones.
- Menu inicial, pantalla de partida y pantalla de resultado.
- Audio desbloqueado despues del primer gesto del usuario.
- Catalogo musical generado automaticamente desde `public/assets/audio/`.
- Juice procedural con particulas, anillos, texto flotante, vibracion, shake y fondo reactivo.
- Mecanica FLOW con medidor, multiplicador x2, cuenta regresiva, ruptura por fallo y resumen final.

La build verificada es `npm run build`. No se deben subir `node_modules/` ni `dist/`; ambos son generados o ignorados por Git.

Requisitos actuales:

- Node.js 22 o superior. Node.js 24 tambien es compatible.
- npm incluido con Node.js.
- Git.
- No se necesita Godot para ejecutar este repositorio.

## Arquitectura y responsabilidades

```text
src/
  main.ts                    Entrada del navegador
  app/                       Composicion de la aplicacion Pixi
  core/                      Contratos reutilizables, escenas y utilidades
  scenes/                    Flujo jugable y futuras pantallas
  game/                      Reglas, score, modos, timing y entidades de juego
    flow/                    Estado FLOW, carga, duracion y multiplicador
    difficulty/              Perfiles Facil, Medio y Dificil
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

11. Los nombres de canciones deben usar un identificador estable en minusculas y guiones, por ejemplo `mi-cancion.mp3` y la carpeta `mi-cancion/`.

## Contrato de interaccion tactil

La dificultad debe medir ritmo y lectura, no las limitaciones fisicas del dispositivo. `src/input/TouchTuning.ts` adapta la interaccion sin alterar las ventanas principales de cada dificultad:

- Dedo: suma 12 px al radio logico y 14 px a la tolerancia lateral del arrastre.
- Pantallas estrechas: agregan entre 2 y 7 px adicionales de asistencia invisible.
- Pen: recibe una asistencia intermedia; mouse conserva la precision base.
- Un arrastre tactil termina al 94% del trayecto para evitar exigir que el dedo cubra visualmente el centro exacto del destino.
- Los toques ligeramente tempranos se guardan hasta 85 ms adicionales en touch, 55 ms en pen y 30 ms en mouse.
- El timestamp del evento compensa hasta 60 ms de retraso de despacho en moviles lentos; nunca inventa tiempo fuera de ese limite.
- Un drag completado y soltado dentro del buffer permanece valido hasta entrar en la ventana de timing.
- El progreso de un drag nunca retrocede por jitter ni falla por salir brevemente del corredor.

Los efectos tienen limites simultaneos de particulas, anillos y textos para evitar que FLOW o Dificil provoquen pausas de recoleccion de memoria. HUD y efectos mantienen `eventMode = none` para no interceptar el canvas jugable.

## Canciones cortas y fases

- Cada audio se trata como un loop de 30 segundos.
- Una partida contiene tres fases y dura 90 segundos.
- El audio vuelve a empezar en cada fase, pero el reloj, score, vidas, combo y FLOW continuan.
- Cada fase tiene un patron distinto para que la repeticion musical no produzca la misma lectura tactil.
- Lectura presenta el pulso, Impulso aumenta movimiento y Climax concentra la mayor intensidad.
- El cambio de fase modifica HUD, color del fondo, particulas y vibracion.
- El motor agenda tres fuentes de audio y mezcla cada union durante 450 ms con curvas de potencia constante. Esto elimina el hueco tecnico del loop nativo.

Si la composicion contiene un cierre, silencio o fade-out muy marcado, el crossfade reduce el corte pero no puede convertirla por completo en un loop musical. Para futuras canciones se debe pedir `seamless loop`, BPM constante, sin intro larga y sin fade-out.

Los beatmaps son compactos. Cada archivo declara `grid`, `offset`, `gap` y un patron que se repite durante la fase. `grid` es la unidad ritmica en segundos y `gap` indica cuantas unidades pasan antes del siguiente objetivo. El cargador expande los patrones a eventos absolutos de 0 a 90 segundos.

```text
public/assets/beatmaps/<id-cancion>/
  easy.json
  medium.json
  hard.json
```

## Balance actual de dificultad

```text
Facil    60 objetivos   6 vidas   Bien +/-260 ms   radio tactil 60 px
Medio   162 objetivos   4 vidas   Bien +/-180 ms   radio tactil 50 px
Dificil 192 objetivos   3 vidas   Bien +/-140 ms   radio tactil 44 px
```

Medio y Dificil usan una rejilla de 0.375 segundos, equivalente a subdividir el pulso provisional de 0.75 segundos. La dificultad debe venir principalmente de densidad, alternancia, arrastres y precision; no de ocultar informacion al jugador.

## Mecanica central de FLOW

- Perfect carga 25 puntos y Bien carga 12; un fallo fuera de FLOW resta 30.
- Al llegar a 100, FLOW se activa automaticamente durante 8 segundos.
- Mientras esta activo, la puntuacion se multiplica por 2 y toda la presentacion cambia.
- Un fallo rompe FLOW de inmediato. Al expirar, el medidor vuelve a cero.
- Los valores viven en `src/game/config.ts` para balancearlos tras pruebas reales.

## Flujo de trabajo

### Preparar otra PC

Clonar el repositorio y entrar en la carpeta:

```bash
git clone https://github.com/mirobo137/pruebaspages.git
cd pruebaspages
npm install
npm run build
```

Para continuar desarrollo:

```bash
npm run dev
```

Si Git informa `detected dubious ownership` en Windows, ejecutar una vez desde la terminal del usuario actual:

```powershell
git config --global --add safe.directory C:/PROYECTOS/pruebas_gitpages
```

Si la carpeta del nuevo equipo tiene otra ruta, sustituirla por la ruta absoluta real.

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

### Agregar una cancion

1. Subir desde el movil un archivo comprimido propio o con licencia compatible a `public/assets/audio/`.
2. En cualquier PC ejecutar `git pull --rebase origin main`.
3. Crear la carpeta `public/assets/beatmaps/<mismo-id>/`.
4. Crear `easy.json`, `medium.json` y `hard.json` dentro de esa carpeta.
5. Confirmar que `trackId` coincide con el nombre base del audio y que cada archivo declara su dificultad.
6. Ejecutar `npm run build`; el script `music:manifest` detecta la cancion automaticamente.
7. Probar en movil y hacer commit/push cuando los patrones esten ajustados.

### Ciclo de prueba recomendado

```text
editar codigo o beatmap -> npm run build -> npm run dev -- --host 0.0.0.0
-> probar en movil -> corregir -> git add/commit/push -> GitHub Pages
```

La primera prueba de FLOW consiste en acertar cuatro objetivos seguidos como `Perfect`. Durante la prueba hay que observar si el objetivo se entiende, si el toque se siente inmediato y si la transformacion visual ayuda o distrae.

### Checklist antes de push

- `npm run build` termina sin errores.
- La cancion se escucha despues del primer toque.
- El toque funciona sin scroll accidental.
- Dedo, pen y mouse conservan una respuesta coherente.
- Los taps tempranos dentro del buffer se aceptan una sola vez.
- Soltar un drag completado ligeramente antes no produce un Miss injusto.
- El arrastre sigue el rastro y llega al destino.
- Los fallos reducen vida y rompen combo.
- FLOW carga, activa x2 y se rompe con un fallo.
- La pantalla de resultado muestra dificultad y fase alcanzada.
- Las rutas siguen siendo relativas para el subdirectorio de GitHub Pages.

## Restricciones de producto

- Solo usar audio propio o con licencia compatible con distribucion web.
- Todos los recursos deben funcionar con rutas relativas bajo el subdirectorio de GitHub Pages.
- La interaccion debe funcionar con dedo y mouse; el teclado puede servir como apoyo de desarrollo.
- No introducir anuncios, monedas, backend o ranking online antes de que el bucle basico sea divertido y medible.
- Las monedas locales solo sirven como experimento de progresion; no se deben convertir en una barrera frustrante antes de tener varias canciones.
- El juego puede inspirarse en generos conocidos, pero la identidad visual, los nombres, el ritmo y las reglas deben evolucionar hacia una propuesta propia.

## Proxima prioridad tecnica

1. Probar tacto y legibilidad en varios moviles reales.
2. Ajustar el beatmap provisional escuchando la cancion.
3. Balancear densidad, timing y tolerancia de las tres dificultades.
4. Guardar mejor puntuacion y estadisticas por cancion.
5. Agregar feedback sonoro corto generado con Web Audio API.
6. Solo despues evaluar preparacion para CrazyGames o Poki.
