import fs from "fs"

export interface User {
    id: number,
    email: string,
    password: string
}

const DB_FILE = "users.json"

export function readUsers(): User[] {
    if(!fs.existsSync(DB_FILE)){
        return []
    }
    const text = fs.readFileSync(DB_FILE, "utf-8")
    return JSON.parse(text)
}

export function saveUsers(users: User[]): void {
    const text = JSON.stringify(users, null, 2)
    fs.writeFileSync(DB_FILE, text)
}