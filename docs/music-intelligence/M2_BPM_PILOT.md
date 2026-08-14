# Piloto M2 - rejilla BPM manual

## Objetivo y limite

M2 reemplaza el mapa tecnico de M1 por una rejilla musical determinista sin usar
todavia analisis del audio. Para `Suno Pilot 01` se usa provisionalmente:

- BPM: `128`.
- Offset del primer pulso: `0.5 s`.
- Generador: `bpm-grid-v1`.
- Fuente: overrides editables en la metadata de la pista.

Estos valores permiten comprobar densidad, dificultad y ergonomia, pero no prueban
que cada nota coincida con un golpe real. M3 medira el audio y M4 seleccionara
oportunidades reales entre beats y onsets.

## Dificultades anidadas

| Dificultad | Rejilla base | Notas del piloto |
|---|---|---:|
| Facil | medias notas | 123 |
| Medio | negras | 214 |
| Dificil | corcheas | 397 |

Toda nota de Facil existe sin cambios en Medio y Dificil; toda nota de Medio existe
sin cambios en Dificil. Comparten ID, tiempo, tipo y geometria canonica. Los perfiles
mouse, touch y pen solo proyectan esa geometria al campo jugable.

Los drags caen sobre pulsos compartidos por las tres dificultades y reservan al
menos `0.9 s` antes de la nota siguiente. No hay acciones simultaneas ni intervalos
de 70-100 ms.

## Comandos

```powershell
npm run music:bpm-beatmaps -- --track untitled-0f61f35777 --force
npm run test:music-bpm
npm run test:travel-budget
```

`--force` solo puede reemplazar Beatmap v2 con `locked: false`. Un mapa bloqueado o
revisado manualmente se conserva.

## Prueba fisica requerida

1. Jugar primero Facil y comprobar que se puede leer sin saturacion.
2. Jugar Medio y confirmar que reconoce el mismo patron con golpes intermedios.
3. Probar una seccion de Dificil y evaluar si la densidad es desafiante pero legible.
4. Confirmar que despues de cada drag existe una pausa perceptible para recolocar.
5. Revisar las entradas en 34 y 82 segundos: no deben producir nota sorpresa, Miss
   fantasma ni perdida de combo.
6. Probar al menos una dificultad con touch y, cuando sea posible, otra con mouse.
7. Anotar si los objetivos parecen adelantados o atrasados de manera constante; eso
   permite corregir `beatOffsetOverride` sin tocar el generador.

La aprobacion de esta prueba cierra M2. Una sensacion todavia poco conectada a la
musica no es un fallo de playback: es justamente la brecha que resolveran M3 y M4.
