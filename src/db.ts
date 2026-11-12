import fs from "fs"

// declaracion de tipos de usuario
export interface User {
    id: number,
    email: string,
    password: string
}

// tipos para implementar refresh token
export interface Session {
    token: string,
    UserId: number,
    expiresAt: number
}

// constante del nombre del archivo que funciona como base de datos
const DB_FILE = "users.json"
// constante del archivo que guardara las session o refresh roken
const DB_SESSION = "sessions.json"

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

// funcion para leer todas las sessions
export function readSessions(): Session[] {
    if(!fs.existsSync(DB_SESSION)){
        return []
    }
    const text = fs.readFileSync(DB_SESSION, "utf-8")
    return JSON.parse(text)
}

// funcion para guardar un array de sessions
export function saveSessions(sessions: Session[]): void {
    const text = JSON.stringify(sessions, null, 2)
    fs.writeFileSync(DB_SESSION, text)
}