---
name: Hono Documentation
description: Offline full copy of the official Hono documentation (hono.dev) — routing, context, requests, middleware, helpers, validators, JSX, RPC, testing and every platform guide. Use whenever writing, reviewing, debugging, or answering questions about Hono code in this folder.
---

# Hono Documentation

Hono is a small, ultrafast web framework built on Web Standards that runs on Cloudflare
Workers, Bun, Deno, Node.js, Vercel, Netlify, AWS Lambda and more.

This skill is an **offline snapshot of the official Hono documentation**, taken from the
[honojs/website](https://github.com/honojs/website) repository (`docs/` folder, commit
`7838d77`, 2026-10-13) and from [hono.dev/llms-full.txt](https://hono.dev/llms-full.txt).

All paths below are relative to this skill folder (`.opencode/skills/hono-docs/`).

## Files

- `references/llms-full.txt` — every documentation page in a single file (official "full
  docs" format, ~400 KB). Best for full-text `grep` across all topics at once.
- `references/llms.txt` — compact index of the documentation site.
- `references/docs/` — the same documentation split into individual Markdown files,
  mirroring the hono.dev URL structure. For example,
  `https://hono.dev/docs/api/routing` → `references/docs/api/routing.md`.

## How to use

1. Locate the relevant page with the map below, or list everything with
   `glob .opencode/skills/hono-docs/references/docs/**/*.md`.
2. Read that file (it contains the same code examples as the website).
3. For questions that span several pages, search the corpus:
   - `grep "zValidator" path=references/docs` → searches every page and returns file + line.
   - `grep "c.req.valid" path=references/llms-full.txt` → the one-file version; the line
     numbers let you `read` the exact section with `offset`/`limit`.
4. If the snapshot looks outdated for the installed Hono version, fetch the live page
   (`https://hono.dev/docs/...`) or the GitHub source.

## Documentation map

| Area | Files | Covers |
| --- | --- | --- |
| Landing | `index.md` | Overview, features, quick start |
| API | `api/hono.md`, `api/routing.md`, `api/context.md`, `api/request.md`, `api/exception.md`, `api/presets.md` | App methods, routes, `Context` (`c`), `HonoRequest`, `HTTPException`, router presets |
| Concepts | `concepts/motivation.md`, `concepts/middleware.md`, `concepts/routers.md`, `concepts/web-standard.md`, `concepts/stacks.md`, `concepts/benchmarks.md`, `concepts/developer-experience.md` | How and why Hono works |
| Guides | `guides/validation.md`, `guides/testing.md`, `guides/rpc.md`, `guides/jsx.md`, `guides/jsx-dom.md`, `guides/best-practices.md`, `guides/middleware.md`, `guides/helpers.md`, `guides/create-hono.md`, `guides/faq.md`, `guides/migrating-to-v5.md` | Task-oriented how-tos |
| Helpers | `helpers/*.md` — accepts, adapter, conninfo, cookie, css, dev, factory, html, jwt, proxy, route, ssg, streaming, testing, websocket | `hono/<helper>` utilities |
| Middleware (built-in) | `middleware/builtin/*.md` — logger, cors, csrf, etag, secure-headers, jsx-renderer, jwt, jwk, basic-auth, bearer-auth, cache, compress, body-limit, pretty-json, request-id, timeout, timing, trailing-slash, method-override, method-not-allowed, ip-restriction, language, combine, context-storage, mount | `hono/<name>` middleware |
| Middleware (third-party) | `middleware/third-party.md` | Validators (Zod, Valibot…), auth, OpenAPI, monitoring, queues |
| Getting started | `getting-started/*.md` — `cloudflare-workers.md`, `cloudflare-workers-vite.md`, `cloudflare-pages.md`, `nodejs.md`, `bun.md`, `deno.md`, `vercel.md`, `aws-lambda.md`, `netlify.md`, `basic.md`, … | One page per platform/template |
| For coding agents | `agents/index.md`, `agents/cli.md` | Hono CLI (`@hono/cli`) and agent resources |

## Core patterns cheat sheet

```ts
import { Hono } from 'hono'
const app = new Hono()

// Routing and params
app.get('/items/:id', (c) => c.json({ id: c.req.param('id') }))
// Query and headers: c.req.query('q') · c.req.header('x-token')
// Raw body: await c.req.json() · c.req.text() · c.req.parseBody()

// Responses
// c.json(obj, 201) · c.text('hi') · c.html('<h1>hi</h1>') · c.redirect('/') · c.notFound()

// Middleware (order of registration matters)
app.use('/api/*', cors())
app.use(async (c, next) => { await next() /* after */ })

// Validation with Zod
app.post('/items', zValidator('json', schema), (c) => c.req.valid('json'))

// Errors
throw new HTTPException(404, { message: 'not found' })
app.onError((err, c) => err instanceof HTTPException ? err.getResponse() : c.text('Error', 500))
```

For anything beyond this, read the corresponding page in `references/docs/`.

## Notes for this workspace

`hono/workers` is a Hono app running on **Cloudflare Workers** with Wrangler and TypeScript:

- `hono` (v4, `^4.13.13`) — `import { Hono } from 'hono'`.
- `@hono/zod-validator` + `zod` — `zValidator('json', schema)` and `c.req.valid('json')`.
- `hono/http-exception` — `HTTPException` and `app.onError`.
- Bindings come from `wrangler types` (`worker-configuration.d.ts`, interface `CloudflareBindings`).

Most useful pages here: `getting-started/cloudflare-workers.md`, `guides/validation.md`,
`api/exception.md`, `api/context.md`, `api/request.md`, `middleware/builtin/*`.

The snapshot tracks the website's `main` branch, which documents the latest release plus a
`guides/migrating-to-v5.md` page about the upcoming v5. This project pins **Hono v4** — prefer
v4 APIs unless a v5 upgrade is explicitly being done.

## Updating the snapshot

```powershell
# Docs pages (sparse clone of just the docs/ folder)
git clone --depth 1 --filter=blob:none --sparse https://github.com/honojs/website.git tmp-website
git -C tmp-website sparse-checkout set docs
# then copy tmp-website/docs over references/docs

# One-file versions
curl.exe -L -o references/llms.txt https://hono.dev/llms.txt
curl.exe -L -o references/llms-full.txt https://hono.dev/llms-full.txt
```

See also: online docs at <https://hono.dev/docs> and the official Hono agent skills
(<https://github.com/honojs/skills>).
