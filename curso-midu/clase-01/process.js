console.log(process.argv)

console.log('nombre: ', process.env.NAME)

console.log(process.cwd())

// paso algo malo
process.exit(1)

// se ejecuto bien
process.exit(0)
