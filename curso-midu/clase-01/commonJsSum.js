// para esta forma el type module debe estar eliminado en el package
function sum(a, b) {
    return a + b;
}

function multiplicacion(a, b) {
    return a * b;
}

// si no lo encierras en llaves al importar se le puede cambiar el nombre al importar
module.exports = { sum, multiplicacion };
