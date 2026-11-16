import bcrypt from "bcryptjs"
import { Hasher } from "./Hasher"

export class HasherBcryptImpl implements Hasher {
  constructor(private readonly rounds: number) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds)
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}
