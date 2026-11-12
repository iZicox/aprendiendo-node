// middleware que verifica la autenticacion
import { Request, Response, NextFunction } from "express"
import  jwt  from "jsonwebtoken";

// obtener la clave secreta que encripta/desencripta el jwt
export const JWT_SECRET = "clave-secreta";


export function requireAuth(req: Request, res: Response, next: NextFunction){
    
    // leemos la cookie
    const token = req.cookies.token
    // verificamos si existe la cookie
    if(!token){
        res.status(401).json({error: "No haz iniciado sesion"})
        return;
    }

    try{
        // verificamos con jwt que el token este correcto
        const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
        // guardamos el payload en una variable local de la peticion
        res.locals.userId = payload.userId
        // si todo va bien pasamos al siguiente
        next()
    }catch(error){
        // la captura del error de jwt si el token es mal o caducado
        res.status(401).json({ error: "Token no valido o cauducado" })
    }
}