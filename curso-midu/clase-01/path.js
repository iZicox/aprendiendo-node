
import path from 'node:path'

// separador
console.log(path.sep)

// unir rutas
const filePath = path.join('content', 'padre', 'hijo')
console.log(filePath)

// mostrar archivo
const base = path.basename('/temp/eee/ggg/eee.txt')
console.log(base)

// mostrar archivo sin extension
const filename = path.basename('/temp/eee/ggg/eee.txt', '.txt')
console.log(filename)

// mostrar extension
const extension = path.extname('image.png')
console.log(extension)