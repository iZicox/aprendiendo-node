// Cambia el rol de un usuario en D1.
//
//   npm run admin:promote -- correo@dominio.com            → admin (remoto)
//   npm run admin:promote -- correo@dominio.com --user     → vuelve a user
//   npm run admin:promote -- correo@dominio.com --local    → base local
//
// El correo se valida con una regex estricta antes de meterlo en el SQL, así
// que no puede romper la consulta. El cambio de rol surte efecto en la
// siguiente petición: el middleware lee el rol de la BD, no del token.

import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const local = args.includes('--local')
const role = args.includes('--user') ? 'user' : 'admin'
const email = args
  .find((arg) => !arg.startsWith('--'))
  ?.trim()
  .toLowerCase()

const EMAIL_PATTERN = /^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/

if (!email || !EMAIL_PATTERN.test(email)) {
  console.error(
    'Uso: npm run admin:promote -- correo@dominio.com [--user] [--local]',
  )
  process.exit(1)
}

const sql =
  `UPDATE users SET role = '${role}' WHERE email = '${email}'; ` +
  `SELECT id, email, role FROM users WHERE email = '${email}';`

// Se llama al binario de wrangler con node, sin shell: así no hay problemas
// de comillas ni de npx.cmd en Windows.
execFileSync(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'd1',
    'execute',
    'inventario',
    local ? '--local' : '--remote',
    `--command=${sql}`,
  ],
  { stdio: 'inherit' },
)
