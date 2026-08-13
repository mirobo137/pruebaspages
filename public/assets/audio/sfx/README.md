# Efectos de gameplay

Coloca aqui el efecto real de error con el nombre exacto:

`miss.wav`

El juego lo carga automaticamente al preparar una partida. No requiere editar el
manifest musical ni los beatmaps. Si el archivo no existe o no puede decodificarse,
se utiliza el fallback procedural y la partida continua normalmente.

Recomendaciones: efecto seco, sin silencio inicial, sin musica de fondo, entre 100
y 700 ms, pico moderado y licencia apta para distribucion comercial. WAV se usa
directamente en el navegador; no debe convertirse a MP3.
