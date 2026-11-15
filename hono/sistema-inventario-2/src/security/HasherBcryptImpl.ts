import bcrypt from "bcryptjs";
import { Hasher } from "./hasher";

export class HasherBcryptImpl implements Hasher {

    constructor(private readonly rounds: number) { }

    hash(password: string): string {
        return bcrypt.hashSync(password, this.rounds)
    }

    compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash)
    }
}