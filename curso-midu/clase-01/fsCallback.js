import fs from 'fs';

console.log('lectura de archivos con callback')

console.log('leyendo el primer archivo')

fs.readFile('./prueba.txt', 'utf-8', (err, text) => {
    console.log('primer texto: ', text)
});

console.log('---------haciendo cosas mientras lee el archivo 1');

console.log('leyendo el archivo 2');

fs.readFile('./prueba2.txt', 'utf8', (err, text) => {
    console.log('segundo texto: ', text);
});