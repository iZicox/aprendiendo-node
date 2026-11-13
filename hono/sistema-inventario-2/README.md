```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## migration

donde se guardan las migraciones que genera drizzle

## src/controller

clase que consume el repositorio y gestiona la logica, control de errores y gentiona las request y response http

## src/repository

clases que gestiona las consultas de la tabla y acceso a la base de datos sin logica

## src/middleware

capa intermedia para cros o auth

## src/route

mapeo de las rutas y que controlador implementa

## src/schema

validacion de los body con zod

## src/db

donde se guarda las clases que mapean las tablas para generar el script sql

## seed.sql

script sql con datos de prueba y datos que necesita la aplicacion para funcionar
