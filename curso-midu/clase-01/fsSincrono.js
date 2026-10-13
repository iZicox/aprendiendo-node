import fs from 'fs';

// ver datos del archivo
console.log('estadisticas del archivo')
const stats = fs.statSync('./prueba.txt');
console.log(stats.isFile(), // true si es un fichero 
    // 
    stats.isDirectory(), // true si es una carpeta 
    // 
    stats.isSymbolicLink(), // true si es un enlace simbólico 
    // 
    stats.size // tamaño en bytes 
)

// lectura de archivos sincrona
console.log('lectura de archivos sincronos')
const text = fs.readFileSync('./prueba.txt', 'utf-8');
console.log('primer archivo: ', text)

console.log('----- haciendo cosas mientras lee el archivo 1');

const text2 = fs.readFileSync('./prueba2.txt', 'utf-8');
console.log('segundo archivo: ', text2);