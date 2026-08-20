# SUPERFLOW - trabajo restante

Este es el plan activo de release y plataformas. La interpretacion musical se sigue
en `MUSIC_INTERPRETATION_ROADMAP_2.md`; ambos sustituyen las hojas antiguas de LiveOps,
perfil PC, 11.5 y Music Intelligence. Estado actualizado: 2026-08-18.

La siguiente sesion de producto se sigue en `RETENTION_UX_RELEASE_ROADMAP.md`:
ruleta diaria, expansion de cosmeticos, playlist v2 y preparacion de release sin SDK.
La expansion de temas, barras modulares y preview de premios de la ruleta ya esta
implementada. R3.2 deja la playlist limpia sin seleccion y expande el contexto solo
al tocar una cancion; falta probarla en GitHub Pages desde movil y decidir si requiere
mas profundidad visual o una tarjeta seleccionada mas grande.

La comprobacion agrupada de candidato ya esta disponible:

```powershell
npm run release:check
```

Ejecuta la suite completa, la build, el presupuesto del bundle, `git diff --check` y
una revision de las rutas publicadas dentro de `dist`.

## Estado global

La implementacion del juego esta cerrada. El usuario aprobo PC, mouse, touch, movil,
fullscreen, resize, calidad adaptativa, audio de juicios, Danger, FLOW/SUPER FLOW,
derrota, revive, anuncios simulados, evento, skins y las tres dificultades. La suite
y el build cubren 23 canciones y 69 mapas.

Music Intelligence M0-M6 historica esta cerrada y la Interpretacion Musical 2 queda
activa para el siguiente ciclo: las 23 canciones largas de Suno ya tienen Analysis
por bandas, Easy/Medium/Hard Musical v2 y 69 mapas oficiales bloqueados. El editor
visual completo sigue fuera de alcance por ahora; la curacion humana fina de cada
pista es el siguiente paso. Mouse y touch conservan `inputProfileId` y version
espacial separados; no se mezclaran rankings competitivos hasta obtener evidencia.

## P0 - Revision editorial del lote Musical v2

- [x] Generar y validar Musical v2 para las 23 canciones.
- [x] Probar la interpretacion v2 publicada en GitHub Pages desde movil.
- [x] Bloquear los 69 mapas oficiales con `npm run music:promote-v2`.
- [ ] Escuchar/probar las 23 canciones al menos una vez para curacion editorial fina.
- [ ] Si una pista no es adecuada, retirarla del catalogo en vez de compensarla con
  reglas especiales que degraden las demas canciones.

La automatizacion estructural ya esta aprobada: nombres unicos, 8 Gratis/5
Economicas/4 Selectas/6 Premium, 23 Analysis v1 y 69 mapas Musical v2. Esta revision
es curacion editorial de contenido, no una fase tecnica pendiente.

## P1 - CrazyGames Preview Tool

- [ ] Subir la build candidata al entorno oficial de Preview.
- [ ] Confirmar carga, `gameplayStart/Stop`, pausa y mute del SDK.
- [ ] Recorrer rewarded exitoso, cancelado, `unfilled`, adblock y error.
- [ ] Probar duplicacion de monedas, revive y skin diaria sin recompensa doble.
- [ ] Confirmar que el juego siempre conserva una ruta sin anuncio.
- [ ] Verificar Data/guardado en el entorno real y repetir en mouse/touch disponibles.

Cierre: marcar Fase 11 completa solo con evidencia del Preview Tool.

## P2 - Poki Inspector

- [ ] Subir la misma build candidata a Poki Inspector.
- [ ] Confirmar el orden de `gameLoadingFinished`, `gameplayStart` y `gameplayStop`.
- [ ] Recorrer revive, duplicacion y skin con recompensa, cancelacion y error.
- [ ] Confirmar que audio, reloj e input no avanzan mientras el anuncio esta activo.
- [ ] Probar escritorio y movil; verificar que una respuesta sin recompensa no entrega contenido.
- [ ] Revisar checkpoints `measure()` sin duplicar metricas automaticas del anuncio.

Cierre: marcar Fase 12 completa solo con evidencia del Inspector.

## P3 - Candidato de publicacion

- [ ] Confirmar licencia/evidencia comercial privada de cada pista publicada.
- [ ] Revisar privacidad y datos enviados a cada plataforma.
- [ ] Crear icono, miniatura, capturas y textos de tienda.
- [ ] Ejecutar `npm test`, `npm run build` y `git diff --check` en revision limpia.
- [ ] Probar instalacion/carga sin cache y ausencia de 404 en la URL candidata.
- [ ] Crear commit y etiqueta de release despues de aprobar P1/P2.

La ejecucion tecnica del candidato paso el 2026-08-19. No se marca como revision
limpia porque los cambios actuales todavia deben ser revisados y subidos por el
usuario cuando decida consolidarlos.

## P4 - Lanzamiento controlado y datos reales

- [ ] Publicar primero a un grupo o entorno limitado.
- [ ] Observar al menos una ventana real de retorno; idealmente una semana completa.
- [ ] Medir inicio/final de canciones, abandono, retorno, evento semanal y ofertas.
- [ ] Comparar revive y duplicacion antes de cambiar precios o frecuencia.
- [ ] Confirmar que los anuncios no aumentan significativamente el abandono.
- [ ] Decidir con datos si se habilitan rankings y si mouse/touch pueden mezclarse.

Cierre: Fase 13 termina con datos reales, no solo con telemetria instalada.

## Fuera del cierre actual

Objetivos moviles, notas hold, modo entrenamiento, reto diario, resultado compartible,
backend/rankings y visualizadores vendibles como piezas de skin son backlog opcional.
No bloquean Preview, Inspector ni el primer lanzamiento.
