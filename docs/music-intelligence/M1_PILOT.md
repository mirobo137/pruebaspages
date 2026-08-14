# Piloto M1 - cancion completa

## Pista

- Nombre visible: `Suno Pilot 01`.
- `trackId`: `untitled-0f61f35777`.
- Categoria: Selectas, 800 monedas.
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

## Mapas provisionales

- Facil: 38 notas.
- Medio: 62 notas.
- Dificil: 90 notas.
- `generatorVersion`: `m1-technical-pilot-v1`.
- `locked: false` hasta una partida humana y ajuste musical.

Estos mapas prueban playback, fases, pausa, derrota, revive y proyeccion espacial.
No afirman estar sincronizados musicalmente: BPM manual corresponde a M2 y el
analizador offline a M3.

## Prueba fisica requerida

1. Abrir Selectas y elegir `Suno Pilot 01`.
2. Probar al menos una dificultad completa en movil y otra con mouse.
3. Confirmar que el audio nunca se repite, acelera ni hace crossfade.
4. Confirmar transiciones aproximadamente en 34 y 82 segundos sin Miss fantasma.
5. Pausar/reanudar y comprobar que audio y objetivos continúan juntos.
6. Si es posible, revivir en Impulso o Climax y comprobar que la fase reinicia con
   cuenta 3-2-1 y sin reproducir desde el inicio de la cancion.
7. Confirmar que el resultado aparece al terminar el audio completo.

La compuerta M1 solo se aprueba después de esta prueba. Hasta entonces M2 no inicia.
