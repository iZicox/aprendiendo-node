// src/modules/users/user.repository.js
const users = [];
let nextId = 1;

export const userRepository = {
  findByEmail: async (email) => users.find((u) => u.email === email) ?? null,
  findById: async (id) => users.find((u) => u.id === id) ?? null,
  create: async ({ email, passwordHash, role = 'user' }) => {
    const user = { id: nextId++, email, passwordHash, role };
    users.push(user);
    return user;
  },
  deleteAll: async () => { users.length = 0; nextId = 1; },
};