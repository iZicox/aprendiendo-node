// src/modules/users/user.repository.js
const users = []; // donde se guardaran los usuarios en local
let nextId = 1; // contador del id

export const userRepository = {
  // obtener un usuario por us email
  findByEmail: async (email) => users.find((u) => u.email === email) ?? null,
  
  // obtener un usuario por su id
  findById: async (id) => users.find((u) => u.id === id) ?? null,
  
  // crear un nuevo usuario. La contraseña debe estar hasheada
  create: async ({ email, passwordHash, role = 'user' }) => {
    
    // creamos el objeto del usuario nuevo
    const user = { 
      id: nextId++, 
      email, 
      passwordHash, 
      role 
    };

    // insertamos el nuevo registro en el array
    users.push(user);

    // devolvemos al usuario insertado
    return user;
  },

  // eliminar toda la base de datos
  deleteAll: async () => { users.length = 0; nextId = 1; },

  // eliminar por id
  deleteById: async (id) => users[id - 1] = null
};