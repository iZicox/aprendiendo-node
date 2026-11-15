
export interface Hasher {
    hash(password: string): string
    compare(password: string, hash: string): Promise<boolean>
}