import cookieParser from "cookie-parser"
import express from "express"
import { readUsers, saveUsers } from "./db"
import bcrypt from "bcryptjs"
import e from "express"
import jwt from "jsonwebtoken"
import { JWT_SECRET, requireAuth } from "./auth"

// inicializa la app
const app = express()

// middleware de lectura de json
app.use(express.json())
// middleware de lectura de cookies
app.use(cookieParser())

// registro
app.post("/register", async (req, res) => {
    // destructuracion del body
    const { email, password } = req.body

    // verificar que no sean valores vacios
    if(!email || !password){
        res.status(400).json({error: "Falta email o password"})
        return
    }

    // guardamos los usuarios de la base de datos
    const users = readUsers()

    const exist = users.find((user) => user.email === email)
    if(exist){
        res.status(409).json({error: "El email ya esta registrado en la base de datos"})
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
    res.status(201).json({message: "Usuario creado"})

})

// login 
app.post("/login", async (req, res) =>{
    // destructuramos el body
    const { email, password } = req.body

    if(!email || !password){
        res.status(400).json({error: "Falta email o password"})
        return
    }

    const users = readUsers() // leemos la base de datos
    const user = users.find((u) => u.email === email) // buscamos por email

    // verificamos que el usuario exista con ese email
    if(!user){
        res.status(401).json({error: "Credenciales incorrectas"})
        return
    }

    // verificamos la contraseña del body con el hash de la base de datos
    const passwordOk = await bcrypt.compare(password, user.password)
    if(!passwordOk){
        res.status(401).json({error: "Credenciales incorrectas"})
        return
    }

    // creacion del token jwt
    const token = jwt.sign({userId: user.id}, JWT_SECRET, { expiresIn: "1h"})

    // guardamos en una cookie
    res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 60 * 60 * 1000
    })

    res.json({message: "sesion iniciada"})
})

// ruta protegida
// colocamos el middleware en los parametros para verificar que el usuario esta autenticado
app.get("/profile", requireAuth, async (req, res) => {
    // lectura de todos los usuarios de la base de datos
    const users = readUsers()
    const id = res.locals.userId // recuperamos el id que guardo el middleware
    const user = users.find((u) => u.id === id) // recuperamos al usuario con ese id

    // revisar que el usuario exista
    if(!user){
        res.status(404).json({error: "Usuario no encontrado"})
        return
    }

    // devolvemos los datos publicos del usuario (sin contraseña)
    res.json({id: user.id, email: user.email})
})

// cerrar sesion
app.post("/logout", (req, res) => {
    res.clearCookie("token") // limpiar cookie
    res.json({message: "Sesion cerrada"})
})

app.listen(3000, () => {
    console.log("servidor en localhost y puerto 3000")
})