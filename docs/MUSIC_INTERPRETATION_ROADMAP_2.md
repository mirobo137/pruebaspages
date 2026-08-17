# SUPERFLOW - Plan de Interpretacion Musical 2

Plan activo para que los mapas interpreten bateria, bajo, ataques melodicos y riffs,
manteniendo una experiencia justa para touch y mouse. El plan usa librosa offline
para proponer candidatos; la aprobacion final siempre requiere revision humana.

## Objetivo

Convertir cada cancion en una secuencia jugable que conserve:

1. precision temporal sobre el beat y sus subdivisiones;
2. identidad musical mediante golpes, riffs, frases y cambios de energia;
3. legibilidad fisica, sin sobrecargar al jugador ni crear trayectorias imposibles.

## Fases

### PI-0 - Catalogo limpio

- [x] Identificar 24 canciones legacy de 30 segundos generadas para pruebas.
- [x] Identificar 23 canciones Suno de modo `single` y mas de 30 segundos.
- [x] Retirar canciones legacy y conservar `miss.wav`.
- [x] Pasar las 23 canciones Suno por `public/assets/audio/agregadas suno/` para su reimportacion.
- [x] Eliminar metadata, analisis, perfiles y mapas del catalogo anterior.
- [x] Reiniciar el registro automatico y el indice de aprobaciones.

Resultado: 23 pistas largas visibles, 8 gratis, 5 economicas, 4 selectas y 6 premium.

### PI-1 - Analisis v2 por capas

- [x] Conservar el beat global para la rejilla temporal.
- [x] Generar onsets independientes `low`, `mid` y `high` con librosa.
- [x] Versionar el analizador y la cache para evitar resultados obsoletos.
- [x] Validar cobertura estructural, determinismo y rangos en las 23 reimportaciones.

### PI-2 - Intencion musical

- [x] Fusionar beats, onsets globales y onsets por banda.
- [x] Detectar secuencias de tres o mas ataques medios/agudos como candidatos de riff.
- [x] Dar prioridad a riffs en la seleccion de dificultad.
- [x] Usar el paso y direccion del riff para variar el patron espacial.
- [x] Separar candidatos heuristicos de kick, snare, hi-hat y riff con las bandas existentes.
- [ ] Anadir contorno melodico/chroma como senal opcional.

### PI-3 - Generacion jugable

- [x] Mantener Easy < Medium < Hard por subconjuntos temporales.
- [x] Conservar separacion minima, descansos y limites touch/mouse.
- [x] Permitir que energia media tambien sugiera drags sostenidos.
- [x] Ajustar densidad de riffs segun BPM y dificultad, conservando un canon seguro para cualquier pantalla.
- [x] Anadir pruebas de patrones repetidos, secuencias largas y determinismo espacial.

### PI-4 - Comparacion y curacion

- [x] Regenerar las 23 canciones Suno con el generador de bandas.
- [x] Generar previews `hybrid-analysis-m4-musical-v2` para las 23 canciones sin tocar mapas bloqueados.
- [x] Probar la interpretacion v2 en GitHub Pages y confirmar que es jugable en movil.
- [x] Promover Musical v2 a los 69 mapas oficiales y bloquearlos con hashes reproducibles.
- [ ] Comparar cada dificultad de las 23 pistas con el audio, de forma editorial, para una curacion fina.
- [ ] Corregir offsets o secciones mediante metadata, no editando codigo.
- [x] Bloquear el lote aprobado con `music:promote-v2`; las futuras pistas se bloquean individualmente.

### PI-5 - Mejora avanzada opcional

- [ ] Evaluar Basic Pitch sobre capas melodicas aisladas para convertir riffs a MIDI.
- [ ] Evaluar separacion de stems offline solo para canciones complejas.
- [ ] Crear un editor de revision con waveform, beat grid y snap.

## Regla de calidad

La deteccion automatica produce candidatos, no garantiza un mapa final profesional.
Un mapa esta listo cuando el ritmo se puede seguir sin mirar, los riffs se reconocen
al jugar, los drags tienen una intencion musical clara y la trayectoria no rompe la
ergonomia en touch ni mouse.

## Flujo operativo

```text
MP3 en agregadas suno
-> hash/categoria/nombre estable
-> Analysis v1: beat + onsets por banda
-> candidatos de bateria, energia y riffs
-> mapas Easy/Medium/Hard
-> build y pruebas
-> revision humana
-> lock de mapas aprobados
```

El navegador nunca ejecuta Python. Todo el analisis ocurre durante el build local y
los JSON resultantes se publican junto con el juego.

## Prueba movil de la interpretacion v2

La interpretacion v2 ya es oficial. El preview queda disponible para comparar o
regenerar el lote sin tocar los mapas bloqueados:

```powershell
npm run music:hybrid-batch -- --all-analyzed --interpretation-v2
npm run dev -- --host 0.0.0.0
```

Para preparar la senal chroma en una PC con Python 3 y las dependencias de audio:

```powershell
npm run music:chroma-preview
npm run music:hybrid-batch -- --all-analyzed --interpretation-v3
```

La v3 usa los sidecars de `content/music/chroma-preview/` y se publica como
`beatmapPreview=m4-v3`. No reemplaza los mapas bloqueados hasta probarla.

Abrir en el movil una URL como:

```text
http://IP_DE_LA_PC:5173/?beatmapPreview=m4-v2&previewTrack=hollow-motif-0f61f35777
```

Cambiar `previewTrack` por cualquier `trackId` del catalogo. Los mapas oficiales
actuales usan `hybrid-analysis-m4-musical-v2`. Para promover de nuevo un lote v2
validado desde cero se usa:

```powershell
npm run music:hybrid-batch -- --all-analyzed --interpretation-v2
npm run music:promote-v2
```

La v3 con chroma sigue siendo opcional y no debe publicarse como oficial sin una
nueva prueba fisica.
