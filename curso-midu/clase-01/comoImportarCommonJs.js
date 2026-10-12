// importar con Common JS
// tiene que tener el mismo nombre que el export si se encerro entre llaves
const { sum, multiplicacion } = require('./commonJsSum');

let resultado = sum(10, 5)
console.log('suma: ', resultado);
console.log('mutiplicar: ', multiplicacion(10, 5));