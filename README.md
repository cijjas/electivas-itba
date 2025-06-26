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

## Instalación y ejecución local

### Configurar Vercel KV

Para habilitar el almacenamiento de votos y comentarios, es necesario configurar
Vercel KV:

1. Crear un proyecto en [vercel.com](https://vercel.com)
2. Añadir un almacén KV desde el panel de control
3. Obtener las variables `VERCEL_KV_REST_API_URL` y `VERCEL_KV_REST_API_TOKEN`
4. Guardar estas variables en un archivo `.env.local` en la raíz del proyecto

### Ejecutar la aplicación

```bash
git clone https://github.com/cijjas/electivas-itba.git
cd electivas-itba
pnpm install
cp .env.example .env.local   # Completar con tus credenciales de Vercel KV
pnpm dev
```

## Variables de entorno

| Variable                   | Descripción                    |
| -------------------------- | ------------------------------ |
| `VERCEL_KV_REST_API_URL`   | URL del endpoint de Vercel KV  |
| `VERCEL_KV_REST_API_TOKEN` | Token de acceso para Vercel KV |

## Comandos útiles

| Comando           | Descripción                              |
| ----------------- | ---------------------------------------- |
| `pnpm dev`        | Inicia el servidor de desarrollo local   |
| `pnpm build`      | Compila la aplicación para producción    |
| `pnpm start`      | Ejecuta la aplicación en modo producción |
| `pnpm lint`       | Ejecuta ESLint para análisis de código   |
| `pnpm type-check` | Verifica tipos con TypeScript            |
| `pnpm test`       | Ejecuta tests unitarios con Vitest       |
| `pnpm e2e`        | Ejecuta tests end-to-end con Playwright  |

## Cómo contribuir

1. Realizá un fork del repositorio y creá una branch nueva.
2. Ejecutá `pnpm lint`, `pnpm type-check` y `pnpm test` antes de hacer commit.
3. Usá mensajes de commit con formato convencional (ejemplo:
   `feat(vote): permitir deshacer dislike`).
4. Abrí un pull request. Asegurate que todas las pruebas pasen antes de hacer
   merge.

## Licencia

MIT
