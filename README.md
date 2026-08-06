# Pixi Mobile Lab

Starter mínimo para experimentar con un juego móvil usando PixiJS, TypeScript y Vite.

## Desarrollo local

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev
```

Para probarlo desde el móvil en la misma red Wi-Fi, ejecuta:

```bash
npm run dev -- --host 0.0.0.0
```

Después abre en el móvil la URL que muestre Vite usando la IP del ordenador, por ejemplo `http://192.168.1.20:5173`.

## Publicación en GitHub Pages

Cada `push` a `main` compila el juego y lo publica mediante GitHub Actions. Tras el primer despliegue, la URL tendrá esta forma:

```text
https://TU_USUARIO.github.io/NOMBRE_DEL_REPOSITORIO/
```

En el repositorio, revisa `Settings > Pages` y confirma que la fuente sea `GitHub Actions` si GitHub no la selecciona automáticamente.
