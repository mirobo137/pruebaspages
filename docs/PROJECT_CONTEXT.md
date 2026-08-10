# Contexto permanente del proyecto

Este documento es la referencia de trabajo para cualquier cambio futuro. Si una propuesta contradice estas decisiones, primero se debe justificar y actualizar este documento.

## Objetivo del producto

Crear un juego casual de ritmo y precision para movil y navegador de escritorio. El jugador escucha una cancion, anticipa objetivos que aparecen en pantalla y los resuelve con toques o deslizamientos. El juego debe ser facil de entender en segundos, satisfactorio de jugar en sesiones cortas y suficientemente claro para mejorar con cada intento.

El nombre provisional del juego es **SUPERFLOW**, con el descriptor **RHYTHM RUSH**. Puede cambiar durante el desarrollo, pero debe mantenerse consistente en portada, menu y metadatos mientras siga vigente.

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
- Portada inicial procedural con identidad neon, entrada tactil de pantalla completa y transicion al selector musical.
- Selector musical, pantalla de partida y pantalla de resultado.
- Audio desbloqueado desde el boton JUGAR, seguido por cuenta regresiva 3-2-1 sin toque adicional.
- Catalogo musical generado automaticamente desde `public/assets/audio/`.
- Beatmaps iniciales generados automaticamente para canciones nuevas; nunca sobrescriben mapas existentes.
- Juice procedural con objetivos en capas, particulas geometricas, anillos, texto, shake y fondo reactivo.
- Mecanicas FLOW x2 y SUPER FLOW x4 con progresion, degradacion y resumen final.
- Pausa real de Web Audio con Continuar, Reiniciar y Volver al menu.

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
    flow/                    Estados normal, FLOW y SUPER FLOW
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
  generate-music-manifest.mjs    Automatizacion del catalogo musical
  generate-default-beatmaps.mjs  Mapas iniciales para audios nuevos
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
11. La portada es una escena independiente. Solo aparece al abrir el juego; volver desde pausa o resultados lleva directamente al selector musical.

12. Los nombres de canciones deben usar un identificador estable en minusculas y guiones, por ejemplo `mi-cancion.mp3` y la carpeta `mi-cancion/`.

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

## Contrato visual de objetivos

- Los objetivos usan sombra, capas interiores, brillo y reflejo para dar profundidad sin assets externos.
- El aro exterior comunica aproximacion. El aro ambar se intensifica dentro de `Bien` y el verde-agua dentro de `Perfect`.
- Estos aros solo representan las ventanas de dificultad existentes; no alteran hitbox, timing, puntuacion ni asistencia tactil.
- Los drag conservan el mismo corredor logico, pero muestran una guia fina, puntos intermedios, flecha discreta y destino de doble aro.
- FLOW suma geometria dorada y marco sutil. SUPER FLOW suma tunel cian/magenta, estelas radiales y marco de esquinas.
- Nebulosas, poligonos, tunel y particulas se dibujan una vez y se animan mediante transformaciones para proteger el rendimiento movil.

## Canciones cortas y fases

- Cada audio se trata como un loop de 30 segundos.
- Una partida contiene tres fases y dura 90 segundos.
- El audio vuelve a empezar en cada fase, pero el reloj, score, vidas, combo y FLOW continuan.
- Cada fase tiene un patron distinto para que la repeticion musical no produzca la misma lectura tactil.
- Lectura presenta el pulso, Impulso aumenta movimiento y Climax concentra la mayor intensidad.
- El cambio real a Impulso o Climax modifica HUD, fondo, particulas y vibracion.
- La inicializacion de Lectura no emite vibracion, shake ni anuncio de transicion; ningun cambio de fase registra aciertos o modifica FLOW.
- Cada transicion tiene 650 ms protegidos: retira objetivos anteriores sin contarlos como fallo, limpia eventos antiguos, bloquea input y congela FLOW.
- Las fases posteriores reservan al menos 1.5 segundos antes de su primer golpe. El objetivo aparece despues del anuncio con su tiempo normal de lectura.
- Si un dispositivo entra tarde a una fase por un frame lento, se omiten sin penalizacion las notas que ya no tengan tiempo completo de lectura.
- El motor agenda tres fuentes de audio y mezcla cada union durante 450 ms con curvas de potencia constante. Esto elimina el hueco tecnico del loop nativo.

Si la composicion contiene un cierre, silencio o fade-out muy marcado, el crossfade reduce el corte pero no puede convertirla por completo en un loop musical. Para futuras canciones se debe pedir `seamless loop`, BPM constante, sin intro larga y sin fade-out.

Los beatmaps son compactos. Cada archivo declara `grid`, `offset`, `gap` y un patron que se repite durante la fase. `grid` es la unidad ritmica en segundos y `gap` indica cuantas unidades pasan antes del siguiente objetivo. El cargador expande los patrones a eventos absolutos de 0 a 90 segundos.

## Inicio y pausa de partida

- `JUGAR` prepara y desbloquea Web Audio dentro del gesto permitido por el navegador.
- La escena muestra Preparando audio y despues 3, 2, 1, Ya. La musica comienza al terminar la cuenta.
- Durante cuenta regresiva, pausa o transicion de fase no se aceptan toques jugables.
- Pausar suspende el `AudioContext`; por eso musica, reloj, notas y FLOW quedan congelados juntos.
- Ocultar la pagina o cambiar de aplicacion activa la pausa automaticamente para evitar fallos injustos.
- Continuar reanuda el mismo reloj. Reiniciar crea una partida nueva y Volver al menu no entrega recompensa.

```text
public/assets/beatmaps/<id-cancion>/
  easy.json
  medium.json
  hard.json
```

## Balance actual de dificultad

```text
Facil    58 objetivos   6 vidas   Bien +/-260 ms   radio tactil 60 px
Medio   159 objetivos   4 vidas   Bien +/-180 ms   radio tactil 50 px
Dificil 189 objetivos   3 vidas   Bien +/-140 ms   radio tactil 44 px
```

Medio y Dificil usan una rejilla de 0.375 segundos, equivalente a subdividir el pulso provisional de 0.75 segundos. La dificultad debe venir principalmente de densidad, alternancia, arrastres y precision; no de ocultar informacion al jugador.

## Mecanica central de FLOW

- Perfect carga 25 puntos y Bien carga 12; un fallo fuera de FLOW resta 30.
- Al llegar a 100, FLOW se activa automaticamente durante 8 segundos.
- Mientras esta activo, la puntuacion se multiplica por 2 y comienza un medidor separado de SUPER FLOW.
- SUPER FLOW exige cuatro `Perfect` consecutivos dentro de FLOW; un `Bien` reinicia ese progreso.
- SUPER FLOW multiplica la puntuacion por 4, tiene marco y presentacion propios y se sostiene mejor con nuevos `Perfect`.
- Un `Bien` durante SUPER FLOW lo degrada a FLOW x2 con al menos 3.5 segundos restantes; no rompe FLOW.
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

El workflow de GitHub Pages vuelve a sincronizar el contenido en cada build. Para agregar una cancion desde el movil basta con subirla a `public/assets/audio/` y hacer pull en el ordenador. `npm run dev` y `npm run build` generan el catalogo y, si faltan, tres beatmaps iniciales para que la cancion aparezca inmediatamente. Los archivos existentes nunca se sobrescriben.

### Agregar una cancion

1. Subir desde el movil un archivo comprimido propio o con licencia compatible a `public/assets/audio/`.
2. En cualquier PC ejecutar `git pull --rebase origin main`.
3. Ejecutar `npm run build`; `content:sync` detecta la cancion y crea `easy.json`, `medium.json` y `hard.json` si faltan.
4. Probar los patrones iniciales en movil.
5. Editar los beatmaps generados para sincronizarlos realmente con los golpes de la cancion. La automatizacion no vuelve a sobrescribirlos.
6. Confirmar que `trackId` y dificultad son correctos, y hacer commit/push cuando los patrones esten ajustados.

Los beatmaps automaticos incluyen `generated: true` como aviso de que son una base jugable, no una sincronizacion musical definitiva. Una vez ajustado manualmente se puede cambiar a `false` o quitar esa propiedad.

### Ciclo de prueba recomendado

```text
editar codigo o beatmap -> npm run build -> npm run dev -- --host 0.0.0.0
-> probar en movil -> corregir -> git add/commit/push -> GitHub Pages
```

La prueba de progresion consiste en cargar FLOW y despues conseguir cuatro `Perfect` consecutivos. Hay que confirmar que un `Bien` dentro de SUPER FLOW regresa a FLOW x2, mientras un `Miss` rompe todo el estado.

### Checklist antes de push

- `npm run build` termina sin errores.
- JUGAR muestra 3-2-1 y la cancion comienza sin pedir un segundo toque.
- El toque funciona sin scroll accidental.
- Dedo, pen y mouse conservan una respuesta coherente.
- Los taps tempranos dentro del buffer se aceptan una sola vez.
- Soltar un drag completado ligeramente antes no produce un Miss injusto.
- El arrastre sigue el rastro y llega al destino.
- Los aros Bien/Perfect coinciden visualmente con el resultado sin cambiar la ventana real.
- Los fallos reducen vida y rompen combo.
- FLOW carga, activa x2 y se rompe con un fallo.
- Cuatro Perfect consecutivos dentro de FLOW activan SUPER FLOW x4.
- Bien degrada SUPER FLOW a FLOW; Miss rompe ambos.
- El inicio de Lectura no genera vibracion o transicion fantasma.
- Impulso y Climax entran sin notas antiguas, Miss invisible ni perdida de combo.
- Pausa congela audio, notas y FLOW; Continuar conserva el estado.
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
