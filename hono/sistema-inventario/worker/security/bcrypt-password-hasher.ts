import { hash, compare, truncates } from "bcryptjs";

import type { PasswordHasher } from "./password-hasher";

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(
    private readonly rounds: number = 10,
  ) {}

  async hash(password: string): Promise<string> {
    if (truncates(password)) {
      throw new Error(
        "La contraseña no puede superar los 72 bytes en UTF-8",
      );
    }

    return hash(password, this.rounds);
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    if (truncates(password)) {
      return false;
    }

    return compare(password, storedHash);
  }
}