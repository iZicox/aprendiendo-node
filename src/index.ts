import cookieParser from "cookie-parser"
import express, { Response } from "express"
import { readSessions, readUsers, saveSessions, saveUsers, User } from "./db"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { JWT_SECRET, requireAuth } from "./auth"
import crypto from "crypto"
import path from "path"

const ACCESS_TOKEN_DURATION = 15 * 60 * 1000 // 15min
const REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000 // 7d

// crear access token (corto)
function createAccessToken(userId: number) {
    return jwt.sign({ userId: userId }, JWT_SECRET, { expiresIn: "15m" })
}
// crear refresh token (largo)
function createRefreshToken(userId: number) {
    // crear un id aleatorio para el refresh token
    const token = crypto.randomBytes(32).toString("hex")

    // leemos las sesiones registradas
    const sessions = readSessions()

    // lo insertamos
    sessions.push({
        token: token,
        UserId: userId,
        expiresAt: Date.now() + REFRESH_TOKEN_DURATION
    })

    // lo guardamos en la base de datos
    saveSessions(sessions)

    // devolvemos el token
    return token
}

// funcion para guardar los los dos token en la cookie
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: ACCESS_TOKEN_DURATION
    })

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: REFRESH_TOKEN_DURATION
    })
}

// inicializa la app
const app = express()

//agregar la vista con plantillas
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

// middleware de lectura de json
app.use(express.json())
// middleware de lectura de cookies
app.use(cookieParser())

// registro
app.post("/register", async (req, res) => {
    // destructuracion del body
    const { email, password } = req.body

    // verificar que no sean valores vacios
    if (!email || !password) {
        res.status(400).json({ error: "Falta email o password" })
        return
    }

    // guardamos los usuarios de la base de datos
    const users = readUsers()

    const exist = users.find((user) => user.email === email)
    if (exist) {
        res.status(409).json({ error: "El email ya esta registrado en la base de datos" })
        return
    }

    // hash de password
    const passwordHash = await bcrypt.hash(password, 10)

    // construimos el nuevo usuario en un objeto
    const newUser = {
        id: Date.now(),
        email: email,
        password: passwordHash
    }

    users.push(newUser) // guarda el usuario
    saveUsers(users) // guardamos el usuario en la base de datos

    // termina la peticion
    res.status(201).json({ message: "Usuario creado" })

})

// login 
app.post("/login", async (req, res) => {
    // destructuramos el body
    const { email, password } = req.body

    if (!email || !password) {
        res.status(400).json({ error: "Falta email o password" })
        return
    }

    const users = readUsers() // leemos la base de datos
    const user = users.find((u) => u.email === email) // buscamos por email

    // verificamos que el usuario exista con ese email
    if (!user) {
        res.status(401).json({ error: "Credenciales incorrectas" })
        return
    }

    // verificamos la contraseña del body con el hash de la base de datos
    const passwordOk = await bcrypt.compare(password, user.password)
    if (!passwordOk) {
        res.status(401).json({ error: "Credenciales incorrectas" })
        return
    }

    // crear access token
    const accessToken = createAccessToken(user.id)
    // crear refresh token
    const refreshToken = createRefreshToken(user.id)
    // guardar los token en la cookie
    setAuthCookies(res, accessToken, refreshToken)

    res.json({ message: "sesion iniciada" })
})

// ruta del refresh
app.post("/refresh", (req, res) => {
    // leemos el refresh token en la cookie
    const oldToken = req.cookies.refreshToken
    // verificar que exista la cookie
    if (!oldToken) {
        res.status(401).json({ error: "No has iniciado sesion" })
        return
    }

    // cargamos las sesiones
    const sessions = readSessions()
    // buscar la sesion guardada
    const session = sessions.find((s) => s.token === oldToken)
    // verificar que si exista en la base de datos
    if (!session) {
        res.status(401).json({ error: "Refresh token invalido" })
        return
    }

    // de ser correcto lo eliminamos porque solo se puede usar una vez
    saveSessions(sessions.filter((s) => s.token !== oldToken))

    // revisar que no este cauducado
    if (session.expiresAt < Date.now()) {
        res.status(401).json({ error: "Sesion cauducada" })
        return
    }

    // al todo estar bien renovamos los tokens
    const accessToken = createAccessToken(session.UserId)
    const refreshToken = createRefreshToken(session.UserId)
    setAuthCookies(res, accessToken, refreshToken)

    res.json({ message: "Token renovado" })

})

// ruta protegida
// colocamos el middleware en los parametros para verificar que el usuario esta autenticado
app.get("/profile", requireAuth, async (req, res) => {
    // lectura de todos los usuarios de la base de datos
    const users = readUsers()
    const id = res.locals.userId // recuperamos el id que guardo el middleware
    const user = users.find((u) => u.id === id) // recuperamos al usuario con ese id

    // revisar que el usuario exista
    if (!user) {
        res.status(404).json({ error: "Usuario no encontrado" })
        return
    }

    // devolvemos los datos publicos del usuario (sin contraseña)
    res.json({ id: user.id, email: user.email })
})

// cerrar sesion
app.post("/logout", (req, res) => {

    // leemos el refresh en la cookie
    const refreshToken = req.cookies.refreshToken

    // lo eliminamos de la base de datos
    const sessions = readSessions()
    // lo eliminamos
    saveSessions(sessions.filter((s) => s.token !== refreshToken))


    // eliminamos las cookies
    res.clearCookie("accessToken")
    res.clearCookie("refreshToken")
    res.json({ message: "Sesion cerrada" })
})

app.get("/", (req, res) => {
    res.render("index")
})

app.listen(3000, () => {
    console.log("servidor en localhost y puerto 3000")
})