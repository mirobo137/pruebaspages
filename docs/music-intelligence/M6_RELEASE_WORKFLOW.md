# M6 - flujo de contenido y publicacion

Este flujo convierte una descarga de Suno o Mureka en contenido verificable. Los
MP3 originales y la evidencia comercial privada se conservan fuera del repositorio;
el juego publica solo el archivo web autorizado y sus artefactos derivados.

## 1. Ingreso y analisis

1. Copiar el MP3 autorizado a la carpeta de ingreso configurada en `music:ingest`.
2. Ejecutar `npm run music:ingest` y revisar el metadata candidato creado en
   `content/music/metadata/`.
3. Completar proveedor, estado de uso comercial, duracion y, cuando se conozcan,
   tempo y secciones. No marcar `active` antes de aprobar el mapa.
4. Ejecutar el analizador M3 para la pista y revisar sus graficos de diagnostico.
5. Ejecutar `node scripts/generate-hybrid-batch.mjs --all-analyzed`. Se usa Node
   directo porque algunas versiones de npm absorben opciones que comienzan con `--`.

## 2. Curacion

Abrir desarrollo con `?beatmapPreview=m4`. Probar Easy, Medium y Hard completos en
mouse y touch. Para cada pista deben revisarse pulso, cambios de seccion, densidad,
drags, repeticion espacial y notas ambiguas. Las secciones inferidas son provisionales:
se copian al metadata solo despues de revisarlas.

Para promover una candidata:

1. completar `durationSeconds` y `suggestedSections`;
2. cambiar el metadata a `active` y confirmar audio/precio;
3. aplicar el mapa con
   `node scripts/generate-hybrid-beatmaps.mjs --track <id> --apply --force`;
4. volver a jugar las tres dificultades oficiales;
5. protegerlo con
   `node scripts/lock-approved-beatmaps.mjs --track <id>`.

Una vez bloqueado, ni `--force` puede sobrescribirlo. Para modificar un mapa
aprobado se requiere una decision explicita: retirar su entrada del manifiesto,
poner temporalmente `locked: false`, regenerar, repetir la aprobacion fisica y crear
un bloqueo nuevo. Nunca se hace dentro de `content:sync`.

## 3. Verificacion y salida

```powershell
npm run music:release-report
npm run test
npm run build
git diff --check
```

Revisar `M6_CURATION_STATUS.md`, el tamaño de `dist/` y que ningún MP3 candidato no
aprobado haya entrado al manifest normal. En local se comprueba primer inicio,
cambio de pista y reintento. Después se hace la misma matriz en GitHub Pages, Poki
y CrazyGames: mouse, touch, audio al perder foco, fullscreen, calidad adaptativa y
reinicio tras anuncio.

Antes del push, inspeccionar `git status` y `git diff --stat`; después del despliegue,
abrir la URL publicada sin caché y comprobar que manifest, MP3, beatmaps y perfiles
visuales responden sin 404. El reporte automático no puede aprobar rendimiento,
legibilidad ni licencias: esas compuertas requieren evidencia humana.
