# M3 - analizador musical offline

## Resultado

M3 genera evidencia musical reproducible sin cambiar el gameplay. El navegador y
GitHub Pages nunca ejecutan Python: reciben JSON ya analizado y versionado. Python
solo se invoca offline desde `content:sync` cuando entra audio nuevo o queda una
importación pendiente.

El analizador `librosa-m3-bands-v2` extrae:

- duracion decodificada;
- BPM estimado y BPM resuelto por estimacion, `tempoHint` u override;
- beat offset estimado o corregido manualmente;
- beats detectados absolutos;
- onsets con fuerza normalizada;
- onsets independientes por banda (`onsetsByBand.low`, `mid` y `high`);
- volumen y energia low/mid/high cada 0.25 segundos.

Bandas iniciales:

| Banda | Rango |
|---|---:|
| low | 20-250 Hz |
| mid | 250-2,000 Hz |
| high | 2,000-10,000 Hz |

La energia se suaviza durante 0.5 segundos y se normaliza con percentiles 5/95 por
cancion. Esto permite reconocer secciones relativas; no afirma separar instrumentos.

## Muestra analizada

| Pista | BPM estimado | BPM resuelto | Motivo |
|---|---:|---:|---|
| Suno Pilot 01 | 143.554688 | 128 | override M2 provisional |
| Midnight Reggae Trap | 103.359375 | 103.359375 | estimado |
| Neon Country Run | 107.666016 | 107.666016 | estimado |
| Moonlit Arpeggios | 60.09266 | 120.18532 | correccion automatica doble |
| Velvet Storm | 103.359375 | 103.359375 | estimado |
| Fading Static | 103.359375 | 103.359375 | estimado |

El contraste 143.55 estimado frente al override 128 del piloto explica por que la
rejilla M2 se siente consistente pero no completamente unida a la cancion. M4 debe
priorizar `beats[]` y onsets reales, no reconstruir el mapa desde 128 BPM.

## Instalacion en otra PC

Python no forma parte del bundle ni del runtime web. Para regenerar análisis de forma
reproducible:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r tools\audio-analysis\requirements-lock.txt
npm run music:test-analyzer
```

El lanzador también acepta `SUPERFLOW_PYTHON` o detecta `.python`, `.venv`,
`python3` y `python` en ese orden.

## Uso

```powershell
npm run music:analyze -- --track untitled-0f61f35777
npm run music:analyze -- --track untitled-0f61f35777 --force --debug
npm run music:analyze -- --input public/assets/audio/selectas
```

- Sin `--force`, la cache usa hash de audio, version y decisiones de ritmo.
- `--force` repite el analisis y debe producir exactamente los mismos bytes.
- `--debug` escribe graficos locales ignorados por Git.
- El modo carpeta omite audios no asociados a metadata y lo informa.
- Cada pista se escribe atomicamente; un fallo conserva resultados anteriores y no
  impide diagnosticar el archivo afectado.

Los JSON definitivos viven en `content/music/analysis/` y `npm test` los valida sin
Python contra schema, metadata y SHA-256 del MP3. El campo por bandas es opcional en
el contrato para conservar compatibilidad con fixtures y mapas antiguos.
