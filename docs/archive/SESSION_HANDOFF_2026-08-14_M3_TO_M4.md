# Traspaso de sesion - M3 a M4

Fecha: 2026-08-14  
Repositorio: `https://github.com/mirobo137/pruebaspages.git`  
Rama: `main`  
Commit base al comenzar este trabajo: `73b1269 m2 completado`

## Instruccion para la siguiente sesion de IA

Leer completamente, en este orden:

1. `docs/SESSION_HANDOFF_2026-08-14_M3_TO_M4.md`.
2. `docs/PROJECT_CONTEXT.md`.
3. `docs/GAME_OBJECTIVES.md`.
4. `docs/MUSIC_INTELLIGENCE_ROADMAP.md`.
5. `docs/music-intelligence/M3_ANALYZER.md`.
6. `docs/DESKTOP_INPUT_PROFILE_PLAN.md` antes de modificar generacion espacial.

Despues revisar `git status`, verificar que el commit M3 existe y continuar solo con
M4. No reconstruir M0-M3 ni sustituir el gameplay aprobado por una solucion nueva.
Mantener una fase por vez y detenerse para prueba humana antes de M5.

Prompt corto recomendado para abrir la nueva sesion:

> Lee primero `docs/SESSION_HANDOFF_2026-08-14_M3_TO_M4.md` y los documentos que
> este indica. Confirma el estado de Git y continua con M4 de Music Intelligence.
> Conserva los mapas M2 hasta que el generador hibrido M4, sus validadores y la
> prueba fisica del piloto esten listos. No avances a M5 sin mi aprobacion.

## Estado funcional aprobado

- M0 completada: contratos y proteccion de contenido.
- M1 completada: `Suno Pilot 01` reproduce una cancion `single` completa.
- M2 completada y aprobada fisicamente en Facil, Medio y Dificil.
- M2 conserva 123/214/397 notas en el piloto y perfiles mouse/touch/pen compartidos.
- El usuario considera Dificil caotico pero divertido; no reducirlo antes de observar M4.
- El defecto observado en M2 es la predictibilidad espacial: posiciones, secuencias y
  drags forman motivos demasiado obvios. Esto se resuelve en M4, no en el runtime de input.
- M3 completada tecnicamente y no cambia el gameplay desplegado.

## Lo descubierto en M3

- Analizador: `tools/audio-analysis/analyze_song.py`.
- Version: `librosa-m3-v1`.
- El piloto tiene BPM estimado `143.554688`, pero M2 mantiene override provisional
  de `128`. Esta diferencia explica parte de la desconexion entre notas y cancion.
- M4 debe priorizar `beats[]` detectados y onsets; no debe construir el mapa entero
  desde el override 128.
- Se extrajeron BPM estimado/resuelto, beat offset, beats, onsets y energia relativa
  low/mid/high de seis pistas.
- Las bandas M3 son low 20-250 Hz, mid 250-2,000 Hz y high 2,000-10,000 Hz.
- La energia se suaviza a 0.5 s y se muestrea cada 0.25 s.
- Repetir el analisis forzado del piloto produjo exactamente el mismo JSON/SHA-256.
- El modo archivo/carpeta, cache por decisiones+hash, `--force`, debug y correccion
  mitad/doble tienen pruebas automatizadas.

Analisis versionados en `content/music/analysis/`:

- `untitled-0f61f35777.json`.
- `midnight-reggae-trap-3b64364ff7.json`.
- `neon-country-run-6b0d30f214.json`.
- `moonlit-arpeggios-b11d1d0be8.json`.
- `velvet-storm-4a8e9700b5.json`.
- `fading-static-11615b8092.json`.

## Cambios M3 que aun no estaban en Git al crear este traspaso

No se habia hecho commit ni push. Deben incluirse juntos:

- `.gitignore`.
- `content/music/analysis/*.json` (seis archivos).
- `content/music/examples/analysis-v1.example.json`.
- `content/music/schemas/analysis-v1.schema.json`.
- `tools/audio-analysis/analyze_song.py`.
- `tools/audio-analysis/test_analysis.py`.
- `tools/audio-analysis/requirements.txt`.
- `tools/audio-analysis/requirements-lock.txt`.
- `scripts/run-audio-analysis.mjs`.
- `scripts/verify-music-analysis.mjs`.
- `scripts/lib/music-contract-validation.mjs`.
- `package.json`.
- documentos modificados de contexto, objetivos, contratos y roadmap.
- este archivo de traspaso.

Antes de cambiar de PC ejecutar en la PC actual:

```powershell
git add .
git status --short
git commit -m "feat: complete music intelligence M3 analyzer"
git pull --rebase origin main
git push origin main
```

Si `git pull --rebase` informa conflictos, no usar `reset --hard`: resolverlos o
detenerse y pedir ayuda. Confirmar al final:

```powershell
git status
git log -1 --oneline
```

## Elementos locales que no deben subirse

Estan ignorados por Git y se recrean cuando haga falta:

- `.python/`: Python 3.12.10 local de esta PC.
- `.venv/` si se crea en casa.
- `tools/audio-analysis/.cache/`.
- `tools/audio-analysis/.matplotlib/`.
- `tools/audio-analysis/debug/`: seis PNG de diagnostico ya inspeccionados.
- `tools/audio-analysis/__pycache__/` y `*.pyc`.
- `node_modules/`, `dist/` y `public/assets/music-manifest.json`.

No es necesario copiar esas carpetas por USB ni subirlas a GitHub.

## Preparar la PC de casa

Si el repositorio no existe:

```powershell
cd C:\PROYECTOS
git clone https://github.com/mirobo137/pruebaspages.git
cd pruebaspages
npm install
```

Si ya existe y `git status` esta limpio:

```powershell
cd C:\PROYECTOS\pruebas_gitpages
git pull origin main
npm install
```

Los seis Analysis JSON ya viajan en Git. Por eso se puede comenzar M4 sin instalar
Python. Python solo es necesario para analizar o regenerar canciones. Para dejarlo
preparado en Windows, con Python 3.12 instalado:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r tools\audio-analysis\requirements-lock.txt
npm run music:test-analyzer
```

Si `python` no existe pero esta el lanzador de Windows, usar `py -3.12 -m venv .venv`.

Validacion inicial en casa:

```powershell
npm test
npm run build
```

## Evidencia de cierre M3

- `npm run music:test-analyzer`: 6 pruebas Python correctas.
- `npm test`: suite completa correcta; 25 pistas y 75 beatmaps.
- `npm run build`: correcto sin ejecutar Python.
- Bundle principal: 477.60 kB, gzip 138.32 kB.
- `git diff --check`: correcto.

## Siguiente trabajo: M4

Implementar exactamente M4 de `docs/MUSIC_INTELLIGENCE_ROADMAP.md`:

1. Fusionar beats y onsets cercanos en candidatos musicales.
2. Derivar intensidad y segmentos relativos: tranquilo, buildup, pico y break.
3. Seleccionar densidad por dificultad conservando `Easy` subconjunto de `Medium`
   y `Medium` subconjunto de `Hard` cuando sea musical.
4. Reemplazar el motivo espacial repetido por una biblioteca determinista de motivos,
   inversiones, variaciones y call/response.
5. Usar low para acentos, mid para direccion y high solo como detalle opcional Hard.
6. Crear drags por contexto y espacio, con descanso y contratos aprobados de input.
7. Validar cada mapa en mouse, touch y pen mediante los perfiles existentes.
8. Generar preview/diff antes de reemplazar el piloto M2.

Restricciones:

- no usar aleatoriedad runtime ni mapas diferentes por dispositivo;
- no convertir cada onset en nota;
- no sobrescribir mapas `locked`;
- no alterar score, timing, vidas o FLOW por perfil de entrada;
- no avanzar a FFT visual M5 antes de aprobar fisicamente el mapa M4 del piloto;
- conservar los mapas M2 como referencia recuperable hasta aprobar M4.
