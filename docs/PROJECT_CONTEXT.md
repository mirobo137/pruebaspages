# Contexto permanente del proyecto

Este documento es la referencia de trabajo para cualquier cambio futuro. Si una propuesta contradice estas decisiones, primero se debe justificar y actualizar este documento.

La ejecucion ordenada de personalizacion, eventos semanales y anuncios recompensados vive en `docs/LIVEOPS_IMPLEMENTATION_PLAN.md`. Ese documento funciona como compuerta: se implementa y prueba una fase antes de comenzar la siguiente.

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

- Catalogo actual de 24 canciones detectadas automaticamente desde `public/assets/audio/`.
- Tres beatmaps separados por cancion en `public/assets/beatmaps/<id-cancion>/`.
- Dificultades Facil, Medio y Dificil con vidas, timing y tolerancia tactil propios.
- Menu tipo playlist desplazable por dedo o rueda, con numeracion, progreso visible, indicador de scroll, selector segmentado de dificultad y un solo boton Jugar.
- Cuatro pestañas de catalogo por precio: Gratis, Economicas, Selectas y Premium.
- El catalogo actual contiene 11 canciones gratis, 5 economicas, 4 selectas y 4 premium; categoria y precio dependen exclusivamente de la carpeta donde se suban.
- Preview de 5 segundos al tocar cualquier cancion, incluso si aun esta bloqueada.
- Musica de portada/menu en bucle gestionada por `MenuAudioController`; la pista provisional se cambia en `src/content/MenuMusic.ts`.
- Partidas de 90 segundos divididas en Lectura, Impulso y Climax.
- Audio de 30 segundos precargado y decodificado con Web Audio, con reloj jugable continuo durante las tres fases.
- Objetivos `tap` y `drag`, con ventana `Perfect`, `Bien` y `Miss`.
- Vidas, combo, puntuacion, monedas locales y desbloqueo preparado para futuras canciones.
- Una calificacion independiente de 0 a 3 estrellas para cada cancion y dificultad.
- Mejores puntuaciones, combo, precision, Perfect, fallos, FLOW, intentos y partidas completadas guardados localmente.
- Ultima cancion y dificultad elegidas guardadas localmente; al volver al menu la playlist mantiene esa cancion visible.
- Portada inicial procedural con identidad neon, entrada tactil de pantalla completa y transicion al selector musical.
- Selector musical, pantalla de partida y pantalla de resultado.
- Audio desbloqueado desde el boton JUGAR, seguido por cuenta regresiva 3-2-1 sin toque adicional.
- Catalogo musical generado automaticamente desde `public/assets/audio/`.
- Beatmaps iniciales generados automaticamente para canciones nuevas; nunca sobrescriben mapas existentes.
- Juice procedural con objetivos en capas, particulas geometricas, anillos, texto, shake y fondo reactivo.
- Mecanicas FLOW x2 y SUPER FLOW x4 con progresion, degradacion y resumen final.
- Pausa real de Web Audio con Continuar, Reiniciar y Volver al menu.
- Dominio modular de temas visuales con `Neon Pulse` como identidad predeterminada.
- Colores y estilos de objetivos, drags, impactos, FLOW y SUPER FLOW separados de las reglas de gameplay.
- Catalogo y seleccion de temas en memoria, con fallback validado para configuraciones incompletas o invalidas.
- Tres identidades visuales procedurales: `Neon Pulse`, `Cyber Sakura` y `Solar Flux`.
- Cada identidad modifica objetivos, aros de timing, estelas, checkpoints, particulas y fondos FLOW/SUPER FLOW sin alterar gameplay.
- Seleccion temporal para pruebas mediante `?theme=neon-pulse`, `?theme=cyber-sakura` o `?theme=solar-flux`.
- Perfil visual automatico `full`/`reduced`; puede forzarse durante pruebas con `?quality=full` o `?quality=reduced`.
- Pantalla `Coleccion` accesible desde `SKIN` en la playlist, con lista tactil, origen y estado de cada tema.
- Preview animado reutiliza objetivos, drag, particulas y fondos reales; alterna normal, FLOW y SUPER FLOW sin iniciar audio de gameplay.
- El progreso principal usa `ProgressState` version 3 en `superflow:progress:v3`, con checksum y respaldo `superflow:progress:v3:backup`.
- La migracion importa automaticamente monedas, canciones, records, estrellas, preferencias y total de partidas desde v2.
- La seleccion provisional `superflow:visual-theme:v1` se incorpora al inventario v3 durante la migracion.
- El inventario cosmetico y el tema equipado viven en `customization`; eventos y limites recompensados tienen estructuras reservadas y validadas.
- Las claves v2 permanecen intactas como respaldo de compatibilidad durante esta fase.
- `Solar Flux` se desbloquea al acumular 3 partidas; puede previsualizarse bloqueado, pero no equiparse.

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
  customization/             Temas visuales, coleccion, seleccion y validacion
  events/                    Catalogo, reloj UTC, misiones y motor semanal
  input/                     Captura y utilidades de puntero/touch
  platform/                  Adaptadores para persistencia y portales
  progression/               Estrellas, records, monedas y desbloqueos locales
public/assets/
  audio/                     Canciones gratuitas
    economicas/              Canciones de 400 monedas
    selectas/                Canciones de 800 monedas
    premium/                 Canciones de 1,400 monedas
  beatmaps/                  Eventos sincronizados por cancion
  events/                    Campañas semanales configuradas por JSON
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

## Estrellas y records

- Cada combinacion `cancion + dificultad` mantiene un progreso independiente.
- Cero estrellas significa que todavia no se completo la partida.
- Una estrella se obtiene al completar la linea temporal. Existe una gracia final de 0.8 segundos porque los beatmaps colocan su ultima nota hasta 0.75 segundos antes del cierre; alcanzar esa zona cuenta como terminar aunque el ultimo fallo agote la vida.
- Dos estrellas requieren al menos 70% de precision ponderada.
- Tres estrellas requieren al menos 90% de precision ponderada.
- Un `Perfect` aporta 100%, un `Bien` aporta 70% y un `Miss` aporta 0% al calculo.
- Repetir con un resultado inferior nunca elimina estrellas ni reduce un record anterior.
- La ficha conserva puntuacion, combo, precision, Perfect, menor cantidad de fallos, FLOW, SUPER FLOW, intentos, partidas completadas y ultima fecha de juego.

## Persistencia local

- `LocalProgressStorage` es el unico modulo que lee o escribe `localStorage`.
- El formato actual es version 3 y usa la clave `superflow:progress:v3`.
- Los datos se codifican, incluyen checksum, se validan campo por campo y mantienen una copia anterior de respaldo.
- Si el registro principal esta corrupto se intenta recuperar el respaldo.
- El progreso v2 migra automaticamente conservando monedas, canciones, records, estrellas, preferencias y total de partidas.
- La progresion antigua de `rhythm-circles:progression` tambien puede migrar para conservar monedas y canciones desbloqueadas.
- Las preferencias del menu guardan el ID estable de la ultima cancion y la dificultad; campos ausentes reciben valores predeterminados sin perder el resto del progreso.
- Personalizacion guarda inventario y tema equipado; IDs retirados regresan de forma segura al tema predeterminado.
- Esta proteccion detecta corrupcion y manipulacion casual, pero no es seguridad criptografica: el navegador pertenece al jugador y un usuario experto puede modificar su almacenamiento.
- Un portal con ranking competitivo necesitara validar las puntuaciones en un backend o mediante el SDK del portal.

## Economia de canciones

- Gratis: 0 monedas. Todo el catalogo existente queda incluido.
- Economicas: 400 monedas, objetivo de 2 a 3 partidas completadas.
- Selectas: 800 monedas, objetivo de 4 a 6 partidas completadas.
- Premium: 1,400 monedas, objetivo de 7 a 10 partidas completadas.
- Las recompensas ya no dependen directamente de la puntuacion, porque combo, FLOW y densidad hacian que Medio y Dificil entregaran cientos o miles de monedas en una sola partida.
- Una derrota entrega 10 monedas. Una victoria combina premio base, precision, estrellas y multiplicador de dificultad.
- Con la formula actual una partida completada entrega aproximadamente 105-165 monedas en Facil, 142-223 en Medio y 184-289 en Dificil.
- Carpetas, precios y etiquetas viven en `src/content/song-categories.json`; la formula de recompensa vive en `src/progression/Economy.ts`.

## Contrato de interaccion tactil

La dificultad debe medir ritmo y lectura, no las limitaciones fisicas del dispositivo. `src/input/TouchTuning.ts` adapta la interaccion sin alterar las ventanas principales de cada dificultad:

- Dedo: suma 12 px al radio logico y 14 px a la tolerancia lateral del arrastre.
- La cabeza de un drag tiene radio propio, mayor que el de un tap: 82 px en Facil, 72 px en Medio y 64 px en Dificil, antes de sumar asistencia por dispositivo.
- El corredor del drag tambien es independiente: 90 px en Facil, 76 px en Medio y 66 px en Dificil, mas la asistencia tactil.
- Pantallas estrechas: agregan entre 2 y 7 px adicionales de asistencia invisible.
- Pen: recibe una asistencia intermedia; mouse conserva la precision base.
- Un arrastre tactil termina al 94% del trayecto para evitar exigir que el dedo cubra visualmente el centro exacto del destino.
- Los toques ligeramente tempranos se guardan hasta 85 ms adicionales en touch, 55 ms en pen y 30 ms en mouse.
- El timestamp del evento compensa hasta 60 ms de retraso de despacho en moviles lentos; nunca inventa tiempo fuera de ese limite.
- Un drag completado y soltado dentro del buffer permanece valido hasta entrar en la ventana de timing.
- El progreso de un drag nunca retrocede por jitter ni falla por salir brevemente del corredor.
- El timing `Perfect/Bien` del drag se decide al tocar su cabeza. Despues hay 1.0, 0.76 o 0.62 segundos segun dificultad para completar la trayectoria.
- Cada drag exige cruzar dos checkpoints y el destino en orden. Salir del corredor no falla de inmediato; el jugador puede corregir antes de soltar o agotar el tiempo.

Los efectos tienen limites simultaneos de particulas, anillos y textos para evitar que FLOW o Dificil provoquen pausas de recoleccion de memoria. HUD y efectos mantienen `eventMode = none` para no interceptar el canvas jugable.

## Contrato visual de objetivos

- Los objetivos usan sombra, capas interiores, brillo y reflejo para dar profundidad sin assets externos.
- El aro de aproximacion representa exclusivamente `targetLeadTime`: no hereda pulsos, escalado de aparicion, FLOW ni SUPER FLOW.
- Cada nota debe aparecer con la anticipacion completa de su dificultad. Si la densidad solapa ventanas de lectura, pueden coexistir varios objetivos.
- Al tocar objetivos solapados, el motor prioriza el que tenga el instante musical mas cercano al input compensado.
- Una nota que llega al planificador con mas de 75 ms de retraso se omite sin penalizacion; nunca aparece tarde para producir un aro acelerado o un Miss invisible.
- El aro exterior comunica aproximacion. El aro ambar se intensifica dentro de `Bien` y el verde-agua dentro de `Perfect`.
- Estos aros solo representan las ventanas de dificultad existentes; no alteran hitbox, timing, puntuacion ni asistencia tactil.
- Los drag usan curvas Bezier procedurales, marcador movil, dos checkpoints obligatorios, flecha tangente y destino de doble aro.
- Un evento de beatmap puede declarar hasta dos `controls`; si no existen, el motor crea una curvatura determinista y segura dentro del playfield.
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
- El bloqueo tambien compara la fase esperada por el reloj de audio con la fase procesada. Esto cubre el intervalo entre el cruce musical y el siguiente frame visual.
- La transicion no vibra ni sacude el playfield; el anuncio, color y particulas comunican el cambio sin parecer un toque o Miss fantasma.
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

### Rediseño acordado para Fase 11.5

- La expiracion temporal actual produce una falsa sensacion de error y sera retirada antes del lanzamiento a portales.
- FLOW no terminara por tiempo: Perfect y Bien lo sostienen; solo Miss lo rompe.
- SUPER FLOW se sostiene con Perfect, un Bien lo degrada claramente a FLOW y un Miss rompe ambos.
- Pausas, anuncios, transiciones y espacios sin notas no cambian FLOW.
- Activacion, degradacion y ruptura tendran eventos audiovisuales distintos; nunca se reutilizara el efecto de Miss para una transicion neutral.
- El cambio exige rebalancear score, records, misiones y revive, por lo que se implementara como bloque propio y no como ajuste aislado.
- La especificacion completa y sus entregas viven en `docs/PHASE_11_5_MULTIPLATFORM_POLISH.md`.
- Las pruebas humanas de PC pueden diferirse y acumularse sin detener las entregas 11.5A-F. Tests automatizados y simulacion desktop gobiernan el avance provisional; la validacion fisica PC/movil sigue siendo obligatoria solamente para cerrar 11.5G y publicar.

### Perfil de entrada implementado en 11.5A

- `InputGameplayProfile` separa el espacio de objetivos de `TouchTuning`: el primero gobierna layout y presentacion; el segundo conserva asistencia y compensacion por evento.
- El ultimo puntero real (`mouse`, `touch` o `pen`) gobierna el perfil, incluso en equipos hibridos; no se infiere movil solamente por ancho.
- Touch y pen conservan todo el ancho aprobado. Mouse usa un campo centrado limitado por la altura para que 16:9 y ultrawide no generen barridos vacios.
- El cursor nativo se sustituye durante gameplay con una mira y estela PixiJS procedurales; touch no las renderiza.
- En desarrollo se acumulan viewport, puntero, recorrido y juicios, sin persistir ni enviar datos.
- `?mouseReach=compact`, `?mouseReach=balanced` y `?mouseReach=expansive` permiten comparar tres alcances sin bifurcar beatmaps. `balanced` es provisional hasta la validacion fisica de 11.5G.

### Combo focal implementado en 11.5B

- `ComboFocusPresenter` es una capa visual unica y reutilizable; nunca crea un HUD o ticker por nota.
- Se ancla al ultimo impacto y elige entre cinco posiciones, penalizando proximidad con las tres notas visibles siguientes y respetando margenes de HUD/flow.
- Cada acierto muestra combo; Miss muestra ruptura. FLOW solo aparece focalmente desde 75% de carga, mientras FLOW activo muestra el progreso exacto de Perfect hacia SUPER.
- Los hitos son 10, 25 y cada multiplo de 50 desde 50. Combinan escala, aros, particulas y flash sin cambiar score ni timing.
- El `GameHud` permanece como fuente numerica exacta; el presentador focal es comunicacion periferica y puede ocultarse en pausa, transicion o limpieza de partida.

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

El workflow de GitHub Pages vuelve a sincronizar el contenido en cada build. La ubicacion del audio es la unica clasificacion manual necesaria. `npm run dev` y `npm run build` recorren la raiz y las tres carpetas, generan el catalogo con precio y categoria y, si faltan, crean tres beatmaps iniciales. Los beatmaps existentes nunca se sobrescriben.

### Agregar una cancion

1. Subir desde el movil un MP3, OGG o WAV propio o con licencia compatible a una ubicacion:
   - `public/assets/audio/` para Gratis.
   - `public/assets/audio/economicas/` para 400 monedas.
   - `public/assets/audio/selectas/` para 800 monedas.
   - `public/assets/audio/premium/` para 1,400 monedas.
2. En cualquier PC ejecutar `git pull --rebase origin main`.
3. Ejecutar `npm run build`; `content:sync` detecta la cancion, asigna categoria/precio y crea `easy.json`, `medium.json` y `hard.json` si faltan.
4. Probar los patrones iniciales en movil.
5. Editar los beatmaps generados para sincronizarlos realmente con los golpes de la cancion. La automatizacion no vuelve a sobrescribirlos.
6. Confirmar que `trackId` y dificultad son correctos, y hacer commit/push cuando los patrones esten ajustados.

Los beatmaps automaticos incluyen `generated: true` como aviso de que son una base jugable, no una sincronizacion musical definitiva. Una vez ajustado manualmente se puede cambiar a `false` o quitar esa propiedad.

Mover una cancion entre las cuatro ubicaciones cambia su categoria y precio en la siguiente build sin cambiar su progreso, siempre que conserve el mismo nombre. No pueden existir dos canciones con el mismo nombre base aunque esten en carpetas distintas; el build se detiene con un mensaje claro para evitar IDs y beatmaps duplicados.

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
- El aro exterior recorre una duracion constante dentro de la misma dificultad, incluso en patrones densos o con FLOW activo.
- Los fallos reducen vida y rompen combo.
- FLOW carga, activa x2 y se rompe con un fallo.
- Cuatro Perfect consecutivos dentro de FLOW activan SUPER FLOW x4.
- Bien degrada SUPER FLOW a FLOW; Miss rompe ambos.
- El inicio de Lectura no genera vibracion o transicion fantasma.
- Impulso y Climax entran sin notas antiguas, Miss invisible ni perdida de combo.
- Impulso y Climax no emiten vibracion ni shake de impacto al entrar.
- Pausa congela audio, notas y FLOW; Continuar conserva el estado.
- La pantalla de resultado muestra dificultad y fase alcanzada.
- La pantalla de resultado muestra las estrellas obtenidas y conserva un record superior anterior.
- Cambiar dificultad en el menu actualiza estrellas, mejor puntuacion, combo, precision e intentos.
- Tocar una cancion bloqueada permite escuchar un preview de 5 segundos sin desbloquearla.
- Al terminar el preview vuelve automaticamente la musica del menu.
- Volver desde una partida o recargar conserva la cancion y dificultad seleccionadas y deja esa fila visible.
- Las cuatro categorias filtran la playlist sin abrir pantallas adicionales.
- Las 11 canciones gratuitas se pueden jugar sin desbloqueo; las otras 13 respetan su categoria y precio.
- Una cancion nueva aparece en la categoria y con el precio correspondiente a su carpeta.
- Completar cerca del final otorga al menos una estrella; 70% de precision ponderada entrega dos y 90% entrega tres.
- Recargar la pagina conserva monedas, desbloqueos y records.
- Las rutas siguen siendo relativas para el subdirectorio de GitHub Pages.

## Restricciones de producto

- Solo usar audio propio o con licencia compatible con distribucion web.
- Todos los recursos deben funcionar con rutas relativas bajo el subdirectorio de GitHub Pages.
- La interaccion debe funcionar con dedo y mouse; el teclado puede servir como apoyo de desarrollo.
- No activar anuncios reales antes de completar las fases de simulacion y validacion definidas en `docs/LIVEOPS_IMPLEMENTATION_PLAN.md`. GitHub Pages no carga SDK publicitario.
- Las monedas locales solo sirven como experimento de progresion; no se deben convertir en una barrera frustrante antes de tener varias canciones.
- El juego puede inspirarse en generos conocidos, pero la identidad visual, los nombres, el ritmo y las reglas deben evolucionar hacia una propuesta propia.

## Personalizacion, eventos y monetizacion

- Las skins, fondos FLOW y fondos SUPER FLOW se construyen proceduralmente con PixiJS y configuraciones de datos.
- La primera familia incluye Neon Pulse (orbital), Cyber Sakura (segmentada) y Solar Flux (facetada).
- El perfil visual reducido disminuye particulas y geometria ambiental, nunca notas ni respuesta tactil.
- La Coleccion equipa temas completos y contiene un unico slot `MI SKIN` para combinar objetivos, aro, estela, Perfect, FLOW y SUPER FLOW.
- Un tema completo desbloqueado aporta sus seis componentes al editor. Una recompensa parcial de evento aporta su componente inmediatamente, aunque la skin completa siga bloqueada.
- `MI SKIN` se guarda sobre el mismo slot y puede equiparse como cualquier tema. Su composicion nunca modifica hitboxes, timing ni asistencia tactil.
- El modelo conserva un `slotId` estable para permitir en el futuro desbloquear slots personalizados adicionales mediante anuncios u otra recompensa, sin activar todavia monetizacion.
- Un ID cosmetico eliminado o invalido se descarta y el tema equipado vuelve de forma segura a `Neon Pulse`.
- Una skin nunca modifica hitboxes, timing, posiciones logicas ni asistencia tactil.
- El evento semanal desbloquea progresivamente componentes de una coleccion visual durante siete escalones.
- El motor semanal usa semanas de lunes 00:00 UTC a lunes 00:00 UTC y genera un ID estable por campaña y fecha.
- `public/assets/events/weekly-events.json` define vigencia, tema, tres misiones, puntos y siete recompensas; un archivo ausente o invalido equivale a no tener evento activo.
- Las misiones se evalúan una vez al terminar una partida y acumulan entre canciones y dificultades; el cambio de semana crea progreso nuevo.
- La campaña inicial `Neon Ascent` mide canciones completadas, Perfect acumulados y mejor combo; el motor también soporta FLOW y SUPER FLOW.
- Las reclamaciones deben realizarse en orden y cada ID solo puede guardarse una vez.
- El selector musical incluye un acceso `EVENTO`; un signo `!` indica que existe una recompensa lista para reclamar.
- El selector musical usa layouts vertical normal, vertical compacto y horizontal compacto. En pantallas bajas conserva playlist, dificultad y `JUGAR`, y oculta solo subtitulo, ayuda y estadisticas secundarias.
- La pantalla de evento muestra cuenta regresiva UTC, puntos, tres misiones y siete escalones desplazables sin interrumpir partidas.
- Cada escalon reclamado se guarda inmediatamente como componente cosmetico permanente. El septimo desbloquea el tema procedural completo `Neon Ascent` en Coleccion.
- Al tocar el nombre de un evento se abre una vitrina animada de la skin final con vista normal, drag, FLOW y SUPER FLOW, ademas del estado obtenido/pendiente de sus seis piezas.
- Los componentes obtenidos sobreviven al cambio de semana; el progreso semanal se reinicia, pero el inventario no.
- Durante el prototipo se usa el reloj local del dispositivo. Puede manipularse y no debe sostener rankings ni recompensas con valor real sin backend/SDK de portal.
- Los anuncios recompensados se ofrecen fuera del gameplay y siempre son opcionales.
- Los primeros usos previstos son duplicar monedas, una segunda oportunidad segura por fase y una skin publicitaria rotativa.
- Una partida solo puede consumir una oportunidad recompensada de gameplay: revivir o duplicar monedas, no ambas.
- Reanudar tras un anuncio reinicia de forma segura la fase con cuenta regresiva; nunca devuelve al jugador a notas vencidas.
- La integracion usa un contrato neutral con adaptadores de desarrollo, CrazyGames y Poki.
- El juego debe continuar normalmente ante cancelacion, falta de anuncio, adblock o error del SDK.
- `src/monetization/` contiene el contrato neutral, el simulador de desarrollo, el proveedor no disponible, bloqueo concurrente y guardia de entrega unica.
- GitHub Pages siempre recibe `UnavailableAdsService`: no carga SDK, no inicia ciclos de pausa y no debe mostrar ofertas recompensadas.
- En `npm run dev` se puede preparar una simulacion determinista con `?rewardedAd=rewarded`, `cancelled`, `unavailable` o `error`.
- Los callbacks de ciclo se ejecutan solo si el proveedor confirma que el anuncio realmente comenzo. `unavailable` no pausa audio ni input; error tras inicio siempre ejecuta restauracion.
- Cada oportunidad usa un ID estable y `RewardGrantGuard` reclama su clave antes de mutar la recompensa, impidiendo entregas duplicadas por callbacks o taps repetidos.
- Resultado ofrece `DUPLICAR +N` junto a `CONTINUAR` solo cuando el servicio recompensado esta disponible; el valor mostrado es exactamente la recompensa de esa partida.
- Duplicar nunca multiplica el saldo total. Tras `rewarded`, agrega una sola vez `rewardCoins`, guarda inmediatamente y conserva el ID de oportunidad aunque se recargue el almacenamiento.
- Mientras la solicitud esta pendiente, ambas acciones de Resultado quedan bloqueadas. Cancelacion y error no cambian monedas; indisponibilidad oculta la oferta y mantiene `CONTINUAR`.
- La build de GitHub Pages muestra solo `CONTINUAR`. La oferta puede probarse con `npm run dev` y los parametros `rewardedAd` documentados.
- La Coleccion contiene una familia publicitaria basica separada: `Aqua Vector`, `Violet Drive` y `Ember Beat`. Son deliberadamente mas sencillas que la recompensa semanal `Neon Ascent`.
- Una sola skin basica rota cada dia UTC mediante una seleccion determinista. La misma fecha siempre produce la misma oferta y no depende de una llamada remota.
- La skin diaria es una recompensa permanente y completa: desbloquea tambien sus seis componentes para `MI SKIN`. No existen alquileres ni cadenas de varios anuncios.
- Coleccion permite obtener la oferta con un anuncio opcional confirmado o comprarla por 1,200 monedas. La accion publicitaria se oculta como disponible si el adaptador no puede servir anuncios, pero la alternativa por monedas permanece.
- Solo puede obtenerse una recompensa cosmetica rotativa por dia. El limite y la oportunidad reclamada se guardan inmediatamente; cancelacion, error e indisponibilidad no consumen la recompensa.
- GitHub Pages muestra las skins rotativas y la alternativa por monedas, pero nunca presenta el boton publicitario como disponible porque usa `UnavailableAdsService`.
- Al agotar vidas con proveedor disponible, la partida muestra `SEGUNDA OPORTUNIDAD` antes de Resultado. Rechazar, cancelar o fallar el anuncio conduce al resultado normal.
- Lectura, Impulso y Climax guardan un checkpoint de score, estadisticas y activaciones al entrar. Revivir descarta todo lo obtenido dentro del intento fallido de esa fase, evitando duplicar Perfect, score o progreso semanal.
- La reanimacion restaura 50% de la vida redondeada hacia arriba, con minimo de 2 vidas: Facil 3, Medio 2 y Dificil 2.
- Combo, carga FLOW, FLOW y SUPER FLOW vuelven a estado neutral. Se conservan solo mejores combos y activaciones existentes antes del checkpoint.
- Antes del nuevo `3-2-1` se eliminan targets, eventos pendientes, drag, buffer temprano y todos los pointer captures. Audio y beatmap reinician juntos desde el tiempo inicial de la fase.
- Solo existe una oportunidad recompensada de gameplay por partida. Si el anuncio de revive comenzo, Resultado no ofrece despues duplicar monedas; `unavailable` no la marca como consumida, pero oculta las demas ofertas de esa partida por falta de proveedor.
- Las partidas asistidas siguen guardando records locales durante el prototipo. Antes de rankings competitivos deberan marcarse como asistidas y separarse o excluirse de la tabla oficial.

### Adaptador CrazyGames v3

- El SDK oficial se carga dinamicamente solo en dominios de CrazyGames o cuando desarrollo solicita `portal=crazygames`/`useLocalSdk=true`. Nunca se carga en `*.github.io`, incluso si la URL intenta forzarlo.
- El desarrollo normal conserva el simulador `rewardedAd`; produccion fuera de CrazyGames usa el proveedor no disponible.
- `local`, `crazygames` y `disabled` se traducen a servicios de plataforma separados. Un fallo de carga o inicializacion desactiva anuncios sin impedir iniciar el juego.
- Los rewarded usan `requestAd('rewarded')`. Solo `adFinished` concede el premio; `adError` nunca lo concede.
- `unfilled` y `adCooldown` son indisponibilidades temporales. `adblock` y `adsDisabledBasicLaunch` desactivan las ofertas restantes de la sesion. `other` se trata como error recuperable.
- Audio y gameplay solo se detienen cuando `adStarted` confirma que el anuncio comenzo. El callback final restaura el estado aun si el anuncio termina con error.
- El SDK recibe `loadingStart/loadingStop` durante la carga inicial y eventos `gameplayStart/gameplayStop` sin duplicados al comenzar, pausar, reanudar, fallar o terminar una cancion.
- Perder foco pausa localmente por seguridad, pero no emite `gameplayStop`, porque CrazyGames gestiona por su cuenta los cambios de foco.
- `game.settings.muteAudio` controla una ganancia maestra independiente. Ninguna reproduccion posterior puede ignorar el mute impuesto por la plataforma.
- No se implementan anuncios midgame en esta fase; un descanso recompensado nunca se combina con otro tipo de anuncio.
- `CrazyGamesDataStorage` implementa el contrato de guardado y existe una migracion que copia solo claves locales ausentes en Data. No se activa hasta habilitar Progress Save en el portal y validar la migracion con una cuenta real.
- Prueba local oficial: `npm run dev -- --host 0.0.0.0` y abrir `?portal=crazygames`; desde otro dispositivo/IP agregar `?useLocalSdk=true`. La validacion final se realiza subiendo `dist` al Preview Tool.

## Proxima prioridad tecnica

1. Probar tacto y legibilidad en varios moviles reales.
2. Ajustar el beatmap provisional escuchando la cancion.
3. Balancear densidad, timing y tolerancia de las tres dificultades.
4. Guardar mejor puntuacion y estadisticas por cancion.
5. Agregar feedback sonoro corto generado con Web Audio API.
6. Solo despues evaluar preparacion para CrazyGames o Poki.
