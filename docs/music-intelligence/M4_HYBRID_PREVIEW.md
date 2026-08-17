# M4 - historial y referencia del generador hibrido

La interpretacion Musical v2 se probo en `public/assets/beatmap-previews/m4-v2/`
con `?beatmapPreview=m4-v2` y ahora es la version oficial de los 69 mapas.
El generador de bandas v1 queda aqui como referencia historica; la v3 melodica/chroma
continua aislada como preview experimental.

## Estado

- Implementacion tecnica: completada y aprobada.
- Version oficial actual: `hybrid-analysis-m4-musical-v2`.
- Piloto historico de bandas: `hybrid-analysis-m4-bands-v1`.
- Candidatas adicionales: se activan automáticamente para el catálogo de pruebas y
  permanecen `locked: false` hasta la revision humana y su promocion.
- Compuerta: cerrada; M5 iniciado.
- Primera prueba fisica: ritmo y sincronizacion mejoraron en PC y movil; se detecto
  que un subconjunto podia dejar dos notas consecutivas en la misma posicion.
- Segunda prueba fisica: PC y movil correctos; el usuario confirmo que las notas
  consecutivas superpuestas desaparecieron.

M4 usa la musica para decidir **cuando** aparece una nota y una biblioteca de
motivos para decidir **como** se mueve. El generador es offline y produce un solo
Beatmap v2 canonico para todos los perfiles.

## Pipeline

```text
beats + onsets globales + onsets low/mid/high -> fusion 75 ms -> energia/bloques de 4 s
-> compas/frase + rol ritmico -> quiet/buildup/steady/peak/break
-> saliencia, riffs y Easy < Medium < Hard -> motivos/call-response
-> drags por energia sostenida -> Beatmap v2 + diagnostico de cobertura
```

- Los eventos proceden de beats/onsets detectados, no de la rejilla provisional 128 BPM.
- Onsets debiles aislados no se convierten automaticamente en notas.
- Quiet abre espacio; buildup/peak y Climax admiten mayor densidad.
- No hay simultaneidad obligatoria ni intervalos de 70-100 ms.
- Easy es subconjunto exacto de Medium y Medium de Hard.
- Seis motivos admiten inversion horizontal/vertical, recorrido inverso y respuesta.
- Cada dificultad impone separacion canonica minima entre sus cabezas consecutivas;
  eliminar notas intermedias al formar un subconjunto ya no puede superponerlas.
- Los drags nacen de beats con energia low/volumen sostenida durante 800 ms y
  reservan al menos 1.05 s de descanso.
- Cada candidato conserva un rol: tiempo fuerte, contratiempo, pulso, sincopa o riff.
- La fase de compas 4/4 del piloto tiene confianza baja (`0.005136`): organiza
  motivos y frases, pero no se presenta como reconocimiento absoluto del tiempo 1.
- Cada mapa conserva el SHA-256 exacto del Analysis v1 usado.

## Piloto generado

| Dificultad | M2 actual | M4 candidato | Drags |
|---|---:|---:|---:|
| Facil | 123 | 139 | 6 |
| Medio | 214 | 261 | 6 |
| Dificil | 397 | 340 | 6 |

La reduccion de Hard elimina relleno de una rejilla que no coincide con el tempo
estimado, pero concentra notas en golpes y picos reales.

| Dificultad | Beat/onset fuerte | Limites de frase | Sincopas | Saliencia media |
|---|---:|---:|---:|---:|
| Facil | 100.0% | 16 | 1 | 1.285 |
| Medio | 99.2% | 16 | 8 | 1.174 |
| Dificil | 86.2% | 16 | 85 | 1.121 |

Se obtuvieron 21 segmentos: 3 quiet, 4 buildup, 8 steady, 5 peak y 1 break.
Son etiquetas relativas, no reconocimiento cientifico de drops o instrumentos.

## Proyecciones

| Perfil | Dificultad | Viaje medio | Maximo |
|---|---|---:|---:|
| Mouse balanced | Facil | 228.8 px | 340 px |
| Mouse balanced | Medio | 195.0 px | 380 px |
| Mouse balanced | Dificil | 166.0 px | 420 px |
| Touch 390x844 | Facil | 137.9 px | 386.8 px |
| Touch 390x844 | Medio | 120.7 px | 378.0 px |
| Touch 390x844 | Dificil | 108.8 px | 378.0 px |

El validador comprueba mouse/touch/pen, bounds, drags, descanso, contratos de
interaccion, determinismo, anidamiento y que el mapa oficial coincide con el M4
aprobado.

## Uso

```powershell
npm run music:hybrid-preview -- --track <track-id>
npm run test:music-hybrid
```

Para generar varias pistas analizadas en una sola orden:

```powershell
npm run music:hybrid-batch -- --tracks "<track-id-1>,<track-id-2>"
npm run music:hybrid-batch -- --all-analyzed
```

La automatizacion por cancion queda dividida deliberadamente:

1. `music:analyze -- --track <id>` decodifica el audio una sola vez y versiona
   BPM, beats, onsets y energia en `Analysis v1`; su cache depende del hash.
2. `music:hybrid-preview -- --track <id>` consume ese JSON y genera las tres
   dificultades, cobertura musical, proyecciones y catalogo de prueba.
3. Si metadata aún no tiene secciones revisadas, el pipeline de prueba toma la
   duración del análisis e infiere tres fases provisionales, divididas en tercios y
   ajustadas al beat.
4. El preview manual sigue siendo útil para comparar candidatos. La activación
   automática deja el mapa visible pero no lo bloquea; publicar sigue exigiendo
   curación humana, evidencia comercial y bloqueo explícito.

El candidato y su diff viven en:

```text
public/assets/beatmap-previews/m4/untitled-0f61f35777/
```

- M4 oficial: `http://127.0.0.1:5173/`
- M4 preview/dev: `http://127.0.0.1:5173/?beatmapPreview=m4`

El override funciona solo en desarrollo. Una pista sin preview vuelve a su mapa
oficial y produccion ignora el parametro.

## Pruebas adicionales automatizadas

| Cancion | Duracion | BPM | Facil/Medio/Dificil | Drags | Cobertura fuerte F/M/D |
|---|---:|---:|---:|---:|---:|
| Fading Static | 39.734 s | 103.359 | 37/56/88 | 3 | 100%/92.9%/72.7% |
| Moonlit Arpeggios | 214.800 s | 120.185 | 262/365/404 | 18 | 100%/99.2%/91.3% |

URLs directas de desarrollo:

- `http://127.0.0.1:5173/?beatmapPreview=m4&previewTrack=fading-static-11615b8092`
- `http://127.0.0.1:5173/?beatmapPreview=m4&previewTrack=moonlit-arpeggios-b11d1d0be8`

El catalogo de preview las muestra gratis y aisladas para la prueba; no las agrega
al catalogo de produccion, no cambia su estado `candidate` ni crea mapas oficiales.

La promocion oficial de Musical v2 se ejecuta con el comando reproducible:

```powershell
npm run music:promote-v2
```

## Prueba fisica aprobada

1. Jugar Facil y confirmar que los golpes esenciales estan presentes sin ruido.
2. Jugar Medio y comprobar que cambios de patron coinciden con frases percibidas.
3. Llegar al Climax de Dificil y evaluar sincopas frente a legibilidad.
4. Confirmar que los seis drags representan sonidos sostenidos, no golpes secos.
5. Repetir al menos una dificultad en touch y comprobar que no cambio la ergonomia.
6. Comparar con la primera revision M4 antes de aprobar el reemplazo.

La prueba PC/movil, la comparacion multipista y la eliminacion de superposiciones
cerraron la compuerta. Las listas anteriores se conservan como registro.
