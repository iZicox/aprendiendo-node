import { AppError } from "../../shared/errors/AppError"
import bcrypt from "bcryptjs";




export function createAuthService(userRepository){
    return {
        // funcion de registro de usuario
        async register(email, password){
            // controlar que los campos no esten vacios
            if(!email || !password) throw new AppError("Email y password son obligatorios", 400);
            // revisar que el email no exista ya
            if(await userRepository.findByEmail(email)) throw new AppError("Ya hay un usuario registrado con este email", 409);
            // creamos el hash de la contraseña
            const passwordHash = await bcrypt.hash(password, 10);
            // guardamos el nuevo usuario en la base de datos
            const user = await userRepository.creare({email, passwordHash});
            // devolvemos al usuario
            return {id: user.id, email: user.email}
        },
        async login(email, password){

        }
    }
}