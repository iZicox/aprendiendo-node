import fs from "fs"

// declaracion de tipos de usuario
export interface User {
    id: number,
    email: string,
    password: string
}

// constante del nombre del archivo que funciona como base de datos
const DB_FILE = "users.json"

// funcion para leer todos los usuarios
export function readUsers(): User[] {
    if(!fs.existsSync(DB_FILE)){
        return []
    }
    const text = fs.readFileSync(DB_FILE, "utf-8")
    return JSON.parse(text)
}

// funcion para guardar un array de usuarios
export function saveUsers(users: User[]): void {
    const text = JSON.stringify(users, null, 2)
    fs.writeFileSync(DB_FILE, text)
}