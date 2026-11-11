<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# explicame como hacer una autenticacion jwt en express con una arquitectura de capas desde la instalacion de dependencias hasta los test con ejemplos

Para montar autenticación JWT en Express por capas, la petición sigue este camino: **rutas → controladores → servicios → repositorios**. Un middleware valida el token antes de llegar a las rutas protegidas. Para firmar y verificar se usa `jsonwebtoken` (`jwt.sign` y `jwt.verify`), y para los tests, Jest con Supertest.[^1_1][^1_2]

## 1. Instalación y estructura

```bash
mkdir jwt-capas && cd jwt-capas
npm init -y
npm install express jsonwebtoken bcryptjs dotenv
npm install -D jest supertest nodemon
```

Es el mismo conjunto de dependencias que usan los proyectos de referencia con Express, JWT, bcrypt, Jest y Supertest.[^1_3][^1_4]

```
src/
├── config/env.js
├── repositories/user.repository.js
├── services/auth.service.js
├── controllers/auth.controller.js
├── middlewares/auth.middleware.js
├── middlewares/error.middleware.js
├── routes/auth.routes.js
├── utils/AppError.js
├── app.js          ← monta Express (se importa en los tests)
└── server.js       ← solo hace app.listen()
tests/
├── auth.service.test.js
└── auth.routes.test.js
```

`package.json`:

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "test": "jest --runInBand"
}
```

`.env`:

```
PORT=3000
JWT_SECRET=un_secreto_largo_y_aleatorio
JWT_EXPIRES_IN=15m
```


## 2. Qué hace cada capa

| Capa | Responsabilidad | No debe |
| :-- | :-- | :-- |
| Routes | Asociar URL y método con un controlador | Tener lógica |
| Controller | Leer `req` y responder con `res` | Acceder a la BD ni firmar tokens |
| Service | Reglas de negocio: hash, login, JWT | Conocer `req` o `res` |
| Repository | Leer y guardar datos | Tomar decisiones de negocio |
| Middleware | Verificar el token y gestionar errores | — |

### Config y utilidades

```js
// src/config/env.js
require('dotenv').config();
module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'test_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
};
```

```js
// src/utils/AppError.js
class AppError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
module.exports = AppError;
```


### Repositorio (en memoria; luego se cambia por Mongo, Postgres, etc.)

```js
// src/repositories/user.repository.js
const users = [];
let nextId = 1;

module.exports = {
  findByEmail: async (email) => users.find(u => u.email === email) || null,
  findById: async (id) => users.find(u => u.id === id) || null,
  create: async ({ email, passwordHash, role = 'user' }) => {
    const user = { id: nextId++, email, passwordHash, role };
    users.push(user);
    return user;
  },
  _reset: () => { users.length = 0; nextId = 1; }, // solo para tests
};
```


### Servicio (aquí está el JWT)

El servicio recibe el repositorio como parámetro (inyección de dependencias). Así, en los tests se le puede pasar un repositorio falso.

```js
// src/services/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const AppError = require('../utils/AppError');

function createAuthService(userRepository) {
  return {
    async register(email, password) {
      if (!email || !password) throw new AppError('Email y password obligatorios', 400);
      if (await userRepository.findByEmail(email)) throw new AppError('Email ya registrado', 409);
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userRepository.create({ email, passwordHash });
      return { id: user.id, email: user.email };
    },

    async login(email, password) {
      const user = await userRepository.findByEmail(email);
      const ok = user && await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new AppError('Credenciales inválidas', 401);
      const token = jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
      return { token };
    },

    verifyToken(token) {
      try { return jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }); }
      catch { throw new AppError('Token inválido o expirado', 401); }
    },

    async getProfile(userId) {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError('Usuario no encontrado', 404);
      return { id: user.id, email: user.email, role: user.role };
    },
  };
}

module.exports = createAuthService;
```

Por defecto, `jwt.sign` firma con HMAC SHA256. `jwt.verify` devuelve el payload si la firma y la expiración son válidas y lanza un error si no lo son. Si el token ha caducado, el error es `TokenExpiredError`.[^1_5][^1_6][^1_1]

### Controlador

```js
// src/controllers/auth.controller.js
function createAuthController(authService) {
  return {
    register: async (req, res, next) => {
      try { res.status(201).json(await authService.register(req.body.email, req.body.password)); }
      catch (e) { next(e); }
    },
    login: async (req, res, next) => {
      try { res.json(await authService.login(req.body.email, req.body.password)); }
      catch (e) { next(e); }
    },
    profile: async (req, res, next) => {
      try { res.json(await authService.getProfile(req.user.sub)); }
      catch (e) { next(e); }
    },
  };
}
module.exports = createAuthController;
```


### Middlewares

```js
// src/middlewares/auth.middleware.js
const AppError = require('../utils/AppError');

const authenticate = (authService) => (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError('Token requerido', 401));
  try { req.user = authService.verifyToken(token); next(); }
  catch (e) { next(e); }
};

const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('Prohibido', 403));

module.exports = { authenticate, authorize };
```

```js
// src/middlewares/error.middleware.js
module.exports = (err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
};
```


### Rutas, app y servidor

```js
// src/routes/auth.routes.js
const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

module.exports = (controller, authService) => {
  const r = Router();
  r.post('/register', controller.register);
  r.post('/login', controller.login);
  r.get('/profile', authenticate(authService), controller.profile);
  r.get('/admin', authenticate(authService), authorize('admin'), (req, res) => res.json({ ok: true }));
  return r;
};
```

```js
// src/app.js  — composición de dependencias
const express = require('express');
const userRepository = require('./repositories/user.repository');
const createAuthService = require('./services/auth.service');
const createAuthController = require('./controllers/auth.controller');
const authRoutes = require('./routes/auth.routes');
const errorHandler = require('./middlewares/error.middleware');

const authService = createAuthService(userRepository);
const authController = createAuthController(authService);

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes(authController, authService));
app.use(errorHandler);

module.exports = app;
```

```js
// src/server.js
const app = require('./app');
const { port } = require('./config/env');
app.listen(port, () => console.log(`API en http://localhost:${port}`));
```

`app.js` y `server.js` van separados para que Supertest pueda probar la app sin abrir un puerto. La inyección de dependencias también permite meter middlewares o repositorios falsos en los tests.[^1_7][^1_8]

## 3. Probar a mano

```bash
npm run dev
curl -X POST localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"a@a.com","password":"1234"}'
curl -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"a@a.com","password":"1234"}'
# → {"token":"eyJhbGciOi..."}
curl localhost:3000/api/auth/profile -H "Authorization: Bearer eyJhbGciOi..."
```


## 4. Tests unitarios e integración

### Unitario del servicio (repositorio simulado)

```js
// tests/auth.service.test.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createAuthService = require('../src/services/auth.service');

describe('AuthService', () => {
  let repo, service;
  beforeEach(() => {
    repo = { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() };
    service = createAuthService(repo);
  });

  it('register lanza 409 si el email existe', async () => {
    repo.findByEmail.mockResolvedValue({ id: 1 });
    await expect(service.register('a@a.com', '1234')).rejects.toMatchObject({ status: 409 });
  });

  it('login devuelve un JWT válido', async () => {
    repo.findByEmail.mockResolvedValue({ id: 7, role: 'user', passwordHash: await bcrypt.hash('1234', 4) });
    const { token } = await service.login('a@a.com', '1234');
    expect(jwt.decode(token).sub).toBe(7);
  });

  it('login con password incorrecto lanza 401', async () => {
    repo.findByEmail.mockResolvedValue({ id: 7, passwordHash: await bcrypt.hash('1234', 4) });
    await expect(service.login('a@a.com', 'mal')).rejects.toMatchObject({ status: 401 });
  });

  it('verifyToken rechaza un token expirado', () => {
    const token = jwt.sign({ sub: 1 }, process.env.JWT_SECRET || 'test_secret', { expiresIn: -10 });
    expect(() => service.verifyToken(token)).toThrow('Token inválido o expirado');
  });
});
```


### Integración HTTP con Supertest

Supertest prueba el ciclo completo (login, emisión del token, acceso a rutas protegidas y roles) igual que lo haría un cliente real. Una práctica habitual es generar tokens de prueba en `beforeAll` y enviarlos con `.set('Authorization', 'Bearer ...')`.[^1_9][^1_10][^1_3]

```js
// tests/auth.routes.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const userRepository = require('../src/repositories/user.repository');
const { jwtSecret } = require('../src/config/env');

describe('Auth API', () => {
  beforeEach(() => userRepository._reset());

  it('flujo completo: register → login → profile', async () => {
    await request(app).post('/api/auth/register').send({ email: 'a@a.com', password: '1234' }).expect(201);
    const login = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: '1234' }).expect(200);
    const res = await request(app).get('/api/auth/profile')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@a.com');
  });

  it('401 sin token', async () => {
    await request(app).get('/api/auth/profile').expect(401);
  });

  it('401 con token manipulado', async () => {
    const fake = jwt.sign({ sub: 1 }, 'otro_secreto');
    await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${fake}`).expect(401);
  });

  it('403 en /admin para rol user', async () => {
    const token = jwt.sign({ sub: 1, role: 'user' }, jwtSecret);
    await request(app).get('/api/auth/admin').set('Authorization', `Bearer ${token}`).expect(403);
  });

  it('200 en /admin para rol admin', async () => {
    const token = jwt.sign({ sub: 2, role: 'admin' }, jwtSecret);
    await request(app).get('/api/auth/admin').set('Authorization', `Bearer ${token}`).expect(200);
  });
});
```

Ejecuta los tests con `npm test`. El secreto de pruebas conviene ponerlo en un `.env.test` o en la configuración de Jest, con tokens de vida corta y payloads fijos para que los resultados sean predecibles.[^1_9]

## 5. Recomendaciones para producción

- **Secreto:** usa uno largo, guárdalo en variables de entorno y nunca lo subas a git.
- **Algoritmo:** fíjalo en `verify` (`algorithms: ['HS256']`), o usa RS256 con clave pública/privada si varios servicios validan tokens.[^1_1]
- **Duración del token:** que el access token dure poco (unos 15 min) y añade un refresh token de unos 7 días con otro secreto.[^1_3]
- **Decodificar no es verificar:** no uses `jwt.decode` para autenticar, porque no comprueba la firma.[^1_1]
- **Datos sensibles:** no guardes nada sensible en el payload. Va codificado en base64, no cifrado.
- **Abuso del login:** añade `helmet`, limita peticiones en `/login` (`express-rate-limit`) y valida la entrada con `zod` o `joi`.

Un repositorio de ejemplo con este mismo patrón (Controller-Service-Repository, JWT, bcrypt y tests de integración con Jest y Supertest), escrito en TypeScript, es [auth-api-ts-tdd](https://github.com/svajpayee15/auth-api-ts-tdd).[^1_2]

<span style="display:none">[^1_11][^1_12][^1_13][^1_14][^1_15]</span>

<div align="center">⁂</div>

[^1_1]: https://www.npmjs.com/package/jsonwebtoken

[^1_2]: https://github.com/svajpayee15/auth-api-ts-tdd

[^1_3]: https://helpmetest.com/blog/supertest-jwt-authentication-testing/

[^1_4]: https://github.com/boobaGreen/TDD-JEST-SUPERTEST-EXPRESSJS/

[^1_5]: https://github.com/auth0/node-jsonwebtoken

[^1_6]: https://github.com/JavierHernan/jsonwebtoken

[^1_7]: https://waggertron.github.io/tech-learning/topics/web/express/part-09-testing/

[^1_8]: https://stackoverflow.com/questions/78639299/how-to-mock-imported-express-middleware-with-jest-and-using-supertest

[^1_9]: https://www.scriptvalley.com/courses/expressjs-apis-and-middleware/testing-and-deploying-express-apis/how-to-test-authenticated-express-routes-in-jest

[^1_10]: https://stackoverflow.com/questions/69794934/set-an-authentication-token-in-a-request-header-when-using-supertest-with-jest-a

[^1_11]: https://stackoverflow.com/questions/55074443/how-to-use-jsonwebtoken-npm-package-to-verify-jwt-token-issued-by-azure-ad

[^1_12]: https://www.npmjs.com/package/jsonwebtoken/v/7.0.0

[^1_13]: https://npmdoc.github.io/node-npmdoc-jsonwebtoken/build/apidoc.html

[^1_14]: https://github.com/ali-security/node-jsonwebtoken-5dcb35a602d1/blob/master/README.md

[^1_15]: https://github.com/auth0/node-jsonwebtoken/tree/e46ca6634447cf6a5b7f08298aa2f2450b8df704


---

# implementaste una base de datos?

No, no implementé una base de datos real. El repositorio `user.repository.js` guarda los usuarios en un **array** en memoria, así que todo se pierde al reiniciar el servidor. Lo hice así para centrarme en el flujo JWT y en la separación por capas.

## Por qué no es un problema

Como el servicio recibe el repositorio por inyección (`createAuthService(userRepository)`), puedes cambiar a una base de datos real sin tocar servicios, controladores, rutas ni middlewares. Solo tienes que sustituir el repositorio y respetar los mismos métodos: `findByEmail`, `findById` y `create`.

## Ejemplo con MongoDB (Mongoose)

```bash
npm install mongoose
```

```js
// src/models/user.model.js
const { Schema, model } = require('mongoose');
module.exports = model('User', new Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'user' },
}));
```

```js
// src/repositories/user.repository.js
const User = require('../models/user.model');
const toDTO = (u) => u && { id: u._id.toString(), email: u.email, passwordHash: u.passwordHash, role: u.role };

module.exports = {
  findByEmail: async (email) => toDTO(await User.findOne({ email })),
  findById: async (id) => toDTO(await User.findById(id)),
  create: async (data) => toDTO(await User.create(data)),
  _reset: () => User.deleteMany({}),
};
```

```js
// src/server.js
const mongoose = require('mongoose');
const app = require('./app');
const { port } = require('./config/env');

mongoose.connect(process.env.MONGO_URI).then(() =>
  app.listen(port, () => console.log(`API en http://localhost:${port}`)));
```

Añade `MONGO_URI=mongodb://localhost:27017/jwt_capas` al `.env`.

## Cambios en los tests

- **Unitarios:** no cambian, porque ya usan un repositorio simulado con `jest.fn()`.
- **Integración:** necesitan una base de datos. Lo más cómodo es `mongodb-memory-server` (`npm i -D mongodb-memory-server`). Arranca una instancia en `beforeAll`, conecta Mongoose y cierra la conexión en `afterAll`.
- **IDs:** ahora son strings, no números. En el test unitario, `expect(jwt.decode(token).sub).toBe(7)` sigue funcionando porque el mock devuelve `7`. Los tests de integración no dependen del tipo de ID.

Si prefieres PostgreSQL (con Prisma o `pg`), la idea es la misma: solo cambia el repositorio. ¿Te preparo la versión con PostgreSQL?

---

# quiero que uses modulos

Aquí tienes el proyecto con ES Modules (`import`/`export`) y organizado por módulos de funcionalidad. Cada módulo (`auth`, `users`) agrupa sus propias capas: rutas, controlador, servicio y repositorio. Mantengo MongoDB como base de datos.

## Configuración y estructura

```bash
npm install express jsonwebtoken bcryptjs dotenv mongoose
npm install -D jest supertest nodemon mongodb-memory-server
```

`package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand"
  },
  "jest": { "testEnvironment": "node", "transform": {} }
}
```

Jest todavía necesita el flag `--experimental-vm-modules` para ejecutar ESM nativo. Con `"transform": {}` se desactiva Babel.

```
src/
├── config/env.js
├── shared/
│   ├── errors/AppError.js
│   ├── middlewares/error.middleware.js
│   └── database/mongo.js
├── modules/
│   ├── users/
│   │   ├── user.model.js
│   │   ├── user.repository.js
│   │   └── index.js
│   └── auth/
│       ├── auth.service.js
│       ├── auth.controller.js
│       ├── auth.middleware.js
│       ├── auth.routes.js
│       └── index.js
├── app.js
└── server.js
tests/
├── auth.service.test.js
└── auth.routes.test.js
```

Cada `index.js` es la interfaz pública de su módulo: los demás módulos solo importan desde ahí, nunca desde sus archivos internos.

## Código compartido

```js
// src/config/env.js
import 'dotenv/config';
export const env = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'test_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
};
```

```js
// src/shared/errors/AppError.js
export class AppError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
```

```js
// src/shared/middlewares/error.middleware.js
export const errorHandler = (err, req, res, next) =>
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
```

```js
// src/shared/database/mongo.js
import mongoose from 'mongoose';
export const connectDB = (uri) => mongoose.connect(uri);
export const disconnectDB = () => mongoose.disconnect();
```


## Módulo users

```js
// src/modules/users/user.model.js
import { Schema, model } from 'mongoose';
export const User = model('User', new Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'user' },
}));
```

```js
// src/modules/users/user.repository.js
import { User } from './user.model.js';

const toDTO = (u) => u && { id: u._id.toString(), email: u.email, passwordHash: u.passwordHash, role: u.role };

export const userRepository = {
  findByEmail: async (email) => toDTO(await User.findOne({ email })),
  findById: async (id) => toDTO(await User.findById(id)),
  create: async (data) => toDTO(await User.create(data)),
  deleteAll: () => User.deleteMany({}),
};
```

```js
// src/modules/users/index.js
export { userRepository } from './user.repository.js';
```


## Módulo auth

```js
// src/modules/auth/auth.service.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

export function createAuthService(userRepository) {
  return {
    async register(email, password) {
      if (!email || !password) throw new AppError('Email y password obligatorios', 400);
      if (await userRepository.findByEmail(email)) throw new AppError('Email ya registrado', 409);
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userRepository.create({ email, passwordHash });
      return { id: user.id, email: user.email };
    },
    async login(email, password) {
      const user = await userRepository.findByEmail(email);
      const ok = user && await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new AppError('Credenciales inválidas', 401);
      const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
      return { token };
    },
    verifyToken(token) {
      try { return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }); }
      catch { throw new AppError('Token inválido o expirado', 401); }
    },
    async getProfile(userId) {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError('Usuario no encontrado', 404);
      return { id: user.id, email: user.email, role: user.role };
    },
  };
}
```

```js
// src/modules/auth/auth.controller.js
export function createAuthController(authService) {
  const handle = (fn) => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
  return {
    register: handle(async (req, res) => res.status(201).json(await authService.register(req.body.email, req.body.password))),
    login: handle(async (req, res) => res.json(await authService.login(req.body.email, req.body.password))),
    profile: handle(async (req, res) => res.json(await authService.getProfile(req.user.sub))),
  };
}
```

```js
// src/modules/auth/auth.middleware.js
import { AppError } from '../../shared/errors/AppError.js';

export const authenticate = (authService) => (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError('Token requerido', 401));
  try { req.user = authService.verifyToken(token); next(); } catch (e) { next(e); }
};

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('Prohibido', 403));
```

```js
// src/modules/auth/auth.routes.js
import { Router } from 'express';
import { authenticate, authorize } from './auth.middleware.js';

export function createAuthRouter(controller, authService) {
  const r = Router();
  r.post('/register', controller.register);
  r.post('/login', controller.login);
  r.get('/profile', authenticate(authService), controller.profile);
  r.get('/admin', authenticate(authService), authorize('admin'), (req, res) => res.json({ ok: true }));
  return r;
}
```

```js
// src/modules/auth/index.js  — ensambla el módulo
import { createAuthService } from './auth.service.js';
import { createAuthController } from './auth.controller.js';
import { createAuthRouter } from './auth.routes.js';

export function createAuthModule({ userRepository }) {
  const service = createAuthService(userRepository);
  const controller = createAuthController(service);
  return { service, router: createAuthRouter(controller, service) };
}

export { authenticate, authorize } from './auth.middleware.js';
```


## App y servidor

```js
// src/app.js
import express from 'express';
import { userRepository } from './modules/users/index.js';
import { createAuthModule } from './modules/auth/index.js';
import { errorHandler } from './shared/middlewares/error.middleware.js';

export function createApp(deps = { userRepository }) {
  const app = express();
  app.use(express.json());
  const auth = createAuthModule(deps);
  app.use('/api/auth', auth.router);
  app.use(errorHandler);
  return app;
}
```

```js
// src/server.js
import { createApp } from './app.js';
import { connectDB } from './shared/database/mongo.js';
import { env } from './config/env.js';

await connectDB(env.mongoUri);
createApp().listen(env.port, () => console.log(`API en http://localhost:${env.port}`));
```

En ESM puedes usar `await` directamente en el nivel superior del archivo, sin envolverlo en una función.

## Tests con ESM

En ESM, `jest` no está disponible como variable global, así que hay que importarlo desde `@jest/globals`.

```js
// tests/auth.service.test.js
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createAuthService } from '../src/modules/auth/auth.service.js';

describe('AuthService', () => {
  let repo, service;
  beforeEach(() => {
    repo = { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() };
    service = createAuthService(repo);
  });

  it('register lanza 409 si el email existe', async () => {
    repo.findByEmail.mockResolvedValue({ id: '1' });
    await expect(service.register('a@a.com', '1234')).rejects.toMatchObject({ status: 409 });
  });

  it('login devuelve un JWT válido', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'abc', role: 'user', passwordHash: await bcrypt.hash('1234', 4) });
    const { token } = await service.login('a@a.com', '1234');
    expect(jwt.decode(token).sub).toBe('abc');
  });

  it('verifyToken rechaza un token expirado', () => {
    const token = jwt.sign({ sub: '1' }, 'test_secret', { expiresIn: -10 });
    expect(() => service.verifyToken(token)).toThrow('Token inválido o expirado');
  });
});
```

```js
// tests/auth.routes.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/shared/database/mongo.js';
import { userRepository } from '../src/modules/users/index.js';
import { env } from '../src/config/env.js';

let mongo, app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  app = createApp();
});
afterAll(async () => { await disconnectDB(); await mongo.stop(); });
beforeEach(() => userRepository.deleteAll());

describe('Auth API', () => {
  it('register → login → profile', async () => {
    await request(app).post('/api/auth/register').send({ email: 'a@a.com', password: '1234' }).expect(201);
    const { body } = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: '1234' }).expect(200);
    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@a.com');
  });

  it('401 sin token', () => request(app).get('/api/auth/profile').expect(401));

  it('401 con token de otro secreto', () =>
    request(app).get('/api/auth/profile')
      .set('Authorization', `Bearer ${jwt.sign({ sub: '1' }, 'otro')}`).expect(401));

  it('403 en /admin para rol user', () =>
    request(app).get('/api/auth/admin')
      .set('Authorization', `Bearer ${jwt.sign({ sub: '1', role: 'user' }, env.jwtSecret)}`).expect(403));
});
```


## Cambios respecto a la versión anterior

- **Sintaxis:** `require`/`module.exports` pasan a `import`/`export`, con `"type": "module"` en `package.json`.
- **Extensiones:** en ESM las rutas relativas deben llevar `.js` (`./auth.service.js`). Si falta, Node da un error.
- **App:** `createApp(deps)` es una factoría, así que en los tests puedes pasarle un repositorio falso: `createApp({ userRepository: fakeRepo })`.
- **Módulos:** para añadir uno nuevo (por ejemplo `products`), crea `src/modules/products/` con sus capas y su `index.js`, y móntalo en `app.js`.

Si con "módulos" te referías a otra cosa, como usar TypeScript o NestJS, dímelo y lo adapto.

---

# pero no uses una tabla quedate con el array de ejemplo

Perfecto: quito MongoDB y el repositorio vuelve a guardar los usuarios en un array en memoria. El resto de la arquitectura con ES Modules (servicio, controlador, middleware y rutas de `auth`) no cambia, así que aquí van solo los archivos que se modifican o desaparecen.

## Dependencias y estructura

```bash
npm install express jsonwebtoken bcryptjs dotenv
npm install -D jest supertest nodemon
```

Ya no necesitas `mongoose` ni `mongodb-memory-server`. El `package.json` es el mismo (`"type": "module"` y el script de Jest con `--experimental-vm-modules`).

```
src/
├── config/env.js
├── shared/
│   ├── errors/AppError.js
│   └── middlewares/error.middleware.js
├── modules/
│   ├── users/
│   │   ├── user.repository.js
│   │   └── index.js
│   └── auth/
│       ├── auth.service.js
│       ├── auth.controller.js
│       ├── auth.middleware.js
│       ├── auth.routes.js
│       └── index.js
├── app.js
└── server.js
tests/
├── auth.service.test.js
└── auth.routes.test.js
```

Se eliminan `shared/database/mongo.js` y `users/user.model.js`.

## Archivos que cambian

```js
// src/config/env.js
import 'dotenv/config';
export const env = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'test_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
};
```

```js
// src/modules/users/user.repository.js
const users = [];
let nextId = 1;

export const userRepository = {
  findByEmail: async (email) => users.find((u) => u.email === email) ?? null,
  findById: async (id) => users.find((u) => u.id === id) ?? null,
  create: async ({ email, passwordHash, role = 'user' }) => {
    const user = { id: nextId++, email, passwordHash, role };
    users.push(user);
    return user;
  },
  deleteAll: async () => { users.length = 0; nextId = 1; },
};
```

```js
// src/modules/users/index.js
export { userRepository } from './user.repository.js';
```

```js
// src/server.js
import { createApp } from './app.js';
import { env } from './config/env.js';

createApp().listen(env.port, () => console.log(`API en http://localhost:${env.port}`));
```

`app.js`, `auth.service.js`, `auth.controller.js`, `auth.middleware.js`, `auth.routes.js` y `auth/index.js` quedan exactamente igual que en la respuesta anterior. Los métodos del repositorio (`findByEmail`, `findById`, `create`) no han cambiado, así que el servicio no nota la diferencia.

## Tests

El test unitario del servicio no cambia. Si quieres que use IDs numéricos como el array, cambia `'abc'` por `7` en el test de login.

El de integración se simplifica porque ya no hay que arrancar ni cerrar ninguna base de datos:

```js
// tests/auth.routes.test.js
import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { userRepository } from '../src/modules/users/index.js';
import { env } from '../src/config/env.js';

const app = createApp();

beforeEach(() => userRepository.deleteAll());

describe('Auth API', () => {
  it('register → login → profile', async () => {
    await request(app).post('/api/auth/register').send({ email: 'a@a.com', password: '1234' }).expect(201);
    const { body } = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: '1234' }).expect(200);
    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@a.com');
  });

  it('409 si el email ya existe', async () => {
    await request(app).post('/api/auth/register').send({ email: 'a@a.com', password: '1234' });
    await request(app).post('/api/auth/register').send({ email: 'a@a.com', password: '1234' }).expect(409);
  });

  it('401 sin token', () => request(app).get('/api/auth/profile').expect(401));

  it('401 con token de otro secreto', () =>
    request(app).get('/api/auth/profile')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 1 }, 'otro')}`).expect(401));

  it('403 en /admin para rol user', () =>
    request(app).get('/api/auth/admin')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 1, role: 'user' }, env.jwtSecret)}`).expect(403));

  it('200 en /admin para rol admin', () =>
    request(app).get('/api/auth/admin')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 2, role: 'admin' }, env.jwtSecret)}`).expect(200));
});
```

Con el array, `deleteAll()` en `beforeEach` es necesario: como el módulo se carga una sola vez, los usuarios de un test seguirían ahí en el siguiente si no lo vacías.

---

# no me mostraste que contenido tiene app.js

Lo mostré en la versión con ES Modules, pero en la última respuesta solo dije que no cambiaba, sin volver a pegarlo. Aquí está completo, ya sin nada de MongoDB:

```js
// src/app.js
import express from 'express';
import { userRepository } from './modules/users/index.js';
import { createAuthModule } from './modules/auth/index.js';
import { errorHandler } from './shared/middlewares/error.middleware.js';

export function createApp(deps = { userRepository }) {
  const app = express();

  app.use(express.json());

  const auth = createAuthModule(deps);
  app.use('/api/auth', auth.router);

  app.use(errorHandler);

  return app;
}
```


## Qué hace cada parte

- **Imports:** trae el repositorio del módulo `users` (el array), el ensamblador del módulo `auth` y el manejador de errores compartido. Todo se importa desde los `index.js` de cada módulo.
- **`createApp(deps)`:** es una factoría que crea una app nueva cada vez que se llama. Por defecto usa el `userRepository` en memoria, pero puedes pasarle otro.
- **`express.json()`:** convierte el cuerpo JSON de la petición en `req.body`. Sin esto, `req.body.email` sería `undefined` en el controlador.
- **`createAuthModule(deps)`:** crea el servicio con el repositorio y luego el controlador y el router. Las rutas quedan montadas bajo `/api/auth` (`/register`, `/login`, `/profile`, `/admin`).
- **`errorHandler`:** va al final, después de las rutas. Express solo llega a él cuando un controlador o middleware llama a `next(error)`, y responde con el `status` del `AppError`.


## Cómo se usa

En `server.js` se arranca el servidor:

```js
createApp().listen(env.port);
```

En los tests se pasa directamente a Supertest, sin abrir ningún puerto:

```js
const app = createApp();
await request(app).get('/api/auth/profile').expect(401);
```

También puedes usar un repositorio falso para un test concreto:

```js
const fakeRepo = { findByEmail: async () => null, findById: async () => null, create: async (u) => ({ id: 99, ...u }) };
const app = createApp({ userRepository: fakeRepo });
```


---

# recuerdame lo de auth

Este es el módulo `auth` completo en su versión final (ES Modules, con el repositorio en array). Tiene cinco archivos dentro de `src/modules/auth/`.

## Servicio

Contiene la lógica de negocio: el hash de contraseñas con bcrypt y la firma y verificación del JWT.

```js
// src/modules/auth/auth.service.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

export function createAuthService(userRepository) {
  return {
    async register(email, password) {
      if (!email || !password) throw new AppError('Email y password obligatorios', 400);
      if (await userRepository.findByEmail(email)) throw new AppError('Email ya registrado', 409);
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userRepository.create({ email, passwordHash });
      return { id: user.id, email: user.email };
    },

    async login(email, password) {
      const user = await userRepository.findByEmail(email);
      const ok = user && await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new AppError('Credenciales inválidas', 401);
      const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
      return { token };
    },

    verifyToken(token) {
      try { return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }); }
      catch { throw new AppError('Token inválido o expirado', 401); }
    },

    async getProfile(userId) {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError('Usuario no encontrado', 404);
      return { id: user.id, email: user.email, role: user.role };
    },
  };
}
```


## Controlador

Lee los datos de `req`, llama al servicio y responde. Si hay un error, lo pasa a `next()`.

```js
// src/modules/auth/auth.controller.js
export function createAuthController(authService) {
  const handle = (fn) => async (req, res, next) => {
    try { await fn(req, res); } catch (e) { next(e); }
  };

  return {
    register: handle(async (req, res) =>
      res.status(201).json(await authService.register(req.body.email, req.body.password))),
    login: handle(async (req, res) =>
      res.json(await authService.login(req.body.email, req.body.password))),
    profile: handle(async (req, res) =>
      res.json(await authService.getProfile(req.user.sub))),
  };
}
```


## Middleware

`authenticate` comprueba el header `Authorization: Bearer <token>` y guarda el payload en `req.user`. `authorize` comprueba el rol.

```js
// src/modules/auth/auth.middleware.js
import { AppError } from '../../shared/errors/AppError.js';

export const authenticate = (authService) => (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError('Token requerido', 401));
  try { req.user = authService.verifyToken(token); next(); }
  catch (e) { next(e); }
};

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('Prohibido', 403));
```


## Rutas

```js
// src/modules/auth/auth.routes.js
import { Router } from 'express';
import { authenticate, authorize } from './auth.middleware.js';

export function createAuthRouter(controller, authService) {
  const r = Router();
  r.post('/register', controller.register);
  r.post('/login', controller.login);
  r.get('/profile', authenticate(authService), controller.profile);
  r.get('/admin', authenticate(authService), authorize('admin'), (req, res) => res.json({ ok: true }));
  return r;
}
```

| Ruta | Protección | Respuesta correcta |
| :-- | :-- | :-- |
| POST `/api/auth/register` | Ninguna | 201 `{ id, email }` |
| POST `/api/auth/login` | Ninguna | 200 `{ token }` |
| GET `/api/auth/profile` | Token válido | 200 `{ id, email, role }` |
| GET `/api/auth/admin` | Token válido y rol admin | 200 `{ ok: true }` |

## Ensamblado del módulo

Es la interfaz pública del módulo. Recibe el repositorio, conecta servicio, controlador y router, y exporta los middlewares por si otros módulos quieren proteger sus rutas.

```js
// src/modules/auth/index.js
import { createAuthService } from './auth.service.js';
import { createAuthController } from './auth.controller.js';
import { createAuthRouter } from './auth.routes.js';

export function createAuthModule({ userRepository }) {
  const service = createAuthService(userRepository);
  const controller = createAuthController(service);
  return { service, router: createAuthRouter(controller, service) };
}

export { authenticate, authorize } from './auth.middleware.js';
```

El recorrido de una petición a `/profile` es: `app.js` → router → `authenticate` (verifica el token) → controlador → servicio → `userRepository.findById` (busca en el array) → respuesta JSON. Si algo falla en cualquier punto, el `AppError` llega a `errorHandler` con su código HTTP.

---

# muestrame lo de los errores personalizados que tiene AppError

El proyecto usa una sola clase de error personalizada, `AppError`, y un middleware, `errorHandler`, que la convierte en respuesta HTTP. Estos son los dos archivos tal como están:

```js
// src/shared/errors/AppError.js
export class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
```

```js
// src/shared/middlewares/error.middleware.js
export const errorHandler = (err, req, res, next) =>
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
```


## Cómo funciona

- **`extends Error`:** `AppError` es un error normal de JavaScript (tiene `message` y stack trace) al que se le añade el código HTTP en `status`.
- **Cuatro parámetros:** el middleware recibe `(err, req, res, next)`. Express solo lo reconoce como manejador de errores porque tiene cuatro parámetros, así que no puedes quitar `next` aunque no se use.
- **Errores no controlados:** si salta un error que no es `AppError` (un bug, por ejemplo), no tiene `status` y la respuesta es 500.


## Dónde se lanza cada error

| Dónde | Mensaje | Status |
| :-- | :-- | :-- |
| `register` | Email y password obligatorios | 400 |
| `register` | Email ya registrado | 409 |
| `login` | Credenciales inválidas | 401 |
| `verifyToken` | Token inválido o expirado | 401 |
| `getProfile` | Usuario no encontrado | 404 |
| `authenticate` | Token requerido | 401 |
| `authorize` | Prohibido | 403 |

Así viaja un error, por ejemplo en un login con contraseña incorrecta:

1. El servicio hace `throw new AppError('Credenciales inválidas', 401)`.
2. El `handle()` del controlador lo captura y llama a `next(e)`.
3. Express salta las rutas que quedan y llega a `errorHandler`.
4. El cliente recibe `401 { "error": "Credenciales inválidas" }`.

## Mejora opcional con subclases

Para no repetir códigos numéricos por todo el código, puedes añadir subclases en el mismo archivo:

```js
// src/shared/errors/AppError.js
export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

export class BadRequestError extends AppError { constructor(m = 'Petición inválida') { super(m, 400); } }
export class UnauthorizedError extends AppError { constructor(m = 'No autorizado') { super(m, 401); } }
export class ForbiddenError extends AppError { constructor(m = 'Prohibido') { super(m, 403); } }
export class NotFoundError extends AppError { constructor(m = 'No encontrado') { super(m, 404); } }
export class ConflictError extends AppError { constructor(m = 'Conflicto') { super(m, 409); } }
```

Con ellas, el servicio queda más legible:

```js
if (await userRepository.findByEmail(email)) throw new ConflictError('Email ya registrado');
```

También puedes hacer que el middleware oculte los detalles de los errores inesperados:

```js
// src/shared/middlewares/error.middleware.js
import { AppError } from '../errors/AppError.js';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
};
```

Así, un bug inesperado devuelve un mensaje genérico en lugar de mostrar información interna al cliente. Los tests no cambian, porque comprueban `status`, y ese campo sigue existiendo en todas las subclases.

