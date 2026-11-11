import fs from 'node:fs/promises'
import path from 'node:path';

const folder = process.argv[2] ?? '.'

async function ls(folder) {
    
    let file

    try{
        // lectura del directorio
        file = await fs.readdir(folder)
    }catch{
        console.error(`No se puedo leer el directorio ${folder}`)
        process.exit(1)
    }

    const filePromises = file.map(async file => {
        // lectura del archivo
        const filePath = path.join(folder, file)
        let stats

        try{
            // guardar datos del archivo
            stats = await fs.stat(filePath)
        }catch{
            console.error(`No se pudo leer el archivo ${filePath}`)
            process.exit(1)
        }

        const isDirectory = stats.isDirectory()
        const fileType = isDirectory ? 'd' : 'f'
        const fileSize = stats.size
        const fileModified = stats.mtime.toLocaleString()

        return `${fileType} ${file.padEnd(20)} ${fileSize.toString().padStart(10)} ${fileModified}`
    })

    const fileInfo = await Promise.all(filePromises)
    fileInfo.forEach(fileInfo => console.log(fileInfo))

}

ls(folder)