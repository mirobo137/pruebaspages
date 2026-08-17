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
- [ ] Separar candidatos de kick, snare, hi-hat y riff con metricas mas especificas.
- [ ] Anadir contorno melodico/chroma como senal opcional.

### PI-3 - Generacion jugable

- [x] Mantener Easy < Medium < Hard por subconjuntos temporales.
- [x] Conservar separacion minima, descansos y limites touch/mouse.
- [x] Permitir que energia media tambien sugiera drags sostenidos.
- [ ] Ajustar densidad de riffs segun BPM, dificultad y tamano de pantalla.
- [ ] Anadir pruebas de patrones repetidos y secuencias demasiado largas.

### PI-4 - Comparacion y curacion

- [x] Regenerar las 23 canciones Suno con el generador de bandas.
- [ ] Comparar cada dificultad con el audio y revisar si los riffs se perciben.
- [ ] Corregir offsets o secciones mediante metadata, no editando codigo.
- [ ] Bloquear unicamente mapas probados con `lock-approved-beatmaps.mjs`.

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
-> Analysis v2: beat + onsets por banda
-> candidatos de bateria, energia y riffs
-> mapas Easy/Medium/Hard
-> build y pruebas
-> revision humana
-> lock de mapas aprobados
```

El navegador nunca ejecuta Python. Todo el analisis ocurre durante el build local y
los JSON resultantes se publican junto con el juego.
