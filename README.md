# Calificación de Electivas del ITBA

Aplicación web para puntuar y comentar materias electivas del ITBA, desarrollada
con Next.js App Router, Tailwind CSS, shadcn/ui y Vercel KV para almacenamiento
en la nube.

# Objetivo

El objetivo principal es tener una interfaz muy simple que te deje likear y
opinar sobre electivas de forma anonima.

- por que electivas? porque a nadie le importa la puntuación de las materias
  troncales, las tenés que hacer igual
- las materias que se ven son las que estan disponibles en el cuatrimestre que
  sigue. Puede ser confuso ver materias que ya no se dan.
- las materias igual estan guardadas en la BD (si un cuatri no se da, y al
  proximo aparece, vuelve a aparecer en la lista con los likes y comentarios qeu
  se le dio)
- el chiste es que sea muy simple, para buscar informacion de horarios o
  correlativas hay otras herramientas (o debería haber otras)
- las SATS no estan solo porque la api no lo tiene y no me fije lo suficiente
  para meterlas (y que esten actualizadas cuatrimestre a cuatrimestre) admás son
  muy variables estas, cambian casi de cuatri a cuatri.

## Tecnologías utilizadas

- Next.js 14 (React 18, App Router, Server Components)
- TypeScript
- Tailwind CSS + shadcn/ui
- Vercel KV (Redis) para votos y comentarios
- Vercel para hosting

## Requisitos previos

- Node.js ≥ 18
- pnpm ≥ 9

## Ejecutar en desarrollo (modo contribución)

Si querés clonar el repo, probarlo localmente o contribuir, seguí estos pasos:

1. Asegurate de tener Docker instalado. Podés instalarlo desde
   [https://www.docker.com](https://www.docker.com).
2. Levantá una instancia local de Redis con el siguiente comando:

   ```bash
   docker run --name redis-dev -p 6379:6379 -d redis
   ```

3. Copiá el archivo de variables de entorno de ejemplo:

   ```bash
   cp .env.example .env.local
   ```

   Este archivo ya contiene una configuración lista para desarrollo, como:

   ```env
   REDIS_URL=redis://localhost:6379

   NEXT_PUBLIC_COMMENT_MAX_LENGTH=3000
   NEXT_PUBLIC_COMMENT_MIN_LENGTH=10
   NEXT_PUBLIC_REPORT_THRESHOLD=5
   ```

4. Instalá las dependencias y levantá el servidor de desarrollo:

   ```bash
   pnpm install
   pnpm dev
   ```

Una vez hecho esto, la app estará disponible en `http://localhost:3000`.

## Variables de entorno

Las siguientes variables ya están preconfiguradas en `.env.example`. Solo
deberías cambiarlas si querés modificar los valores por defecto:

| Variable                         | Descripción                                                |
| -------------------------------- | ---------------------------------------------------------- |
| `REDIS_URL`                      | URL de conexión a Redis (por defecto local)                |
| `NEXT_PUBLIC_COMMENT_MAX_LENGTH` | Máximo de caracteres por comentario (default: 3000)        |
| `NEXT_PUBLIC_COMMENT_MIN_LENGTH` | Mínimo de caracteres por comentario (default: 10)          |
| `NEXT_PUBLIC_REPORT_THRESHOLD`   | Umbral de reportes para ocultar un comentario (default: 5) |

## Comandos útiles

| Comando      | Descripción                              |
| ------------ | ---------------------------------------- |
| `pnpm dev`   | Inicia el servidor de desarrollo local   |
| `pnpm build` | Compila la aplicación para producción    |
| `pnpm start` | Ejecuta la aplicación en modo producción |
| `pnpm lint`  | Ejecuta ESLint para análisis de código   |

## Cómo contribuir

1. Hacé un fork del repositorio y creá una nueva branch descriptiva.
2. Antes de commitear, ejecutá:
   ```bash
   pnpm lint
   pnpm build
   ```
   Esto asegura que el código siga el estilo del proyecto y que la app compile
   correctamente.
3. Usá mensajes de commit con formato convencional. Ejemplo:
   ```
   feat(vote): permitir deshacer dislike
   ```
4. Abrí un pull request. Asegurate de que todas las pruebas pasen antes de hacer
   merge.

## Licencia

MIT
