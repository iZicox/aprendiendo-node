// si el package no tiene el type module se debe colocar extension .mjs
// de lo contrario se hace automatico
// debe estar encerrado en llaves
import { sum } from './ecmaScriptSum.js';

console.log('suma: ', sum(10, 5));