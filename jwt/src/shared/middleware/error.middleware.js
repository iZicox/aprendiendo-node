// midleware que captura los errores
export const errorHandler = (err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.msg || "Error interno" });
}