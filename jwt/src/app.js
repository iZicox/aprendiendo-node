import express from "express";
import { userRepository } from "./modules/users";


export function createApp( deps = { userRepository }) {
    
    // inicializa la app express
    const app = express();

    // un middleware para procesar jsons
    app.use(express.json());

    const auth = 

}