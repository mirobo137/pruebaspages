# Piloto M1 - cancion completa

## Pista

- Nombre visible: `Suno Pilot 01`.
- `trackId`: `untitled-0f61f35777`.
- Categoria: Selectas, gratuita temporalmente mediante `testingPriceOverride: 0`.
- Audio: MP3, 2.89 MiB.
- Duracion medida desde 5,203 tramas MP3: 124.872 segundos.
- Modo: `single`; se reproduce una vez sin loop, crossfade ni cambio de velocidad.

Ninguna candidata disponible media exactamente 90-120 segundos. Esta pista fue
elegida por ser la mas cercana, solo 4.872 segundos por encima, sin recortar audio.

## Fases tecnicas

| Fase | Inicio | Fin | Duracion |
|---|---:|---:|---:|
| LECTURA | 0 | 34 | 34 s |
| IMPULSO | 34 | 82 | 48 s |
| CLIMAX | 82 | 124.872 | 42.872 s |

Los límites son parte del Beatmap v2 y ya no se calculan dividiendo la cancion en
tres. Revive inicia audio, reloj y eventos exactamente en 34 u 82 segundos.

## Mapas tecnicos usados para aprobar M1

- Facil: 38 notas.
- Medio: 62 notas.
- Dificil: 90 notas.
- `generatorVersion`: `m1-technical-pilot-v1`.
- `locked: false` hasta una partida humana y ajuste musical.

Estos mapas probaron playback, fases, pausa, derrota, revive y proyeccion espacial.
Fueron reemplazados en M2 por mapas `bpm-grid-v1` de 123/214/397 notas. El historial
de Git conserva este escalon tecnico; no se debe volver a ejecutar `music:pilot`
sobre el mapa M2.

## Prueba fisica requerida

1. Abrir Selectas y elegir `Suno Pilot 01`.
2. Probar al menos una dificultad completa en movil y otra con mouse.
3. Confirmar que el audio nunca se repite, acelera ni hace crossfade.
4. Confirmar transiciones aproximadamente en 34 y 82 segundos sin Miss fantasma.
5. Pausar/reanudar y comprobar que audio y objetivos continúan juntos.
6. Si es posible, revivir en Impulso o Climax y comprobar que la fase reinicia con
   cuenta 3-2-1 y sin reproducir desde el inicio de la cancion.
7. Confirmar que el resultado aparece al terminar el audio completo.

La compuerta M1 fue aprobada el 2026-08-14 despues de jugar la cancion completa.
M2 comenzo tras esa aprobacion.
Al terminar las pruebas, eliminar `testingPriceOverride` restaura automáticamente
el precio normal de 800 monedas de la categoria Selectas.
