import argon2 from "argon2";

export class User{
    #id;
    #username;
    #passwordHash;
    #createdAt;
    constructor(id, name, pwd,createdAt = new Date()){
         if ((id !== null && (!Number.isSafeInteger(id) || id < 1)) || !name || !pwd) {
            throw new Error("id doit être un entier positif ou null avant création ; username et passwordHash sont obligatoires");
        }
        this.#id = id;
        this.#username = name;
        this.#passwordHash = pwd;
        this.#createdAt = new Date (createdAt);
    }

     get id() {
        return this.#id;
    }

    get username() {
        return this.#username;
    }
    get createdAt() { return new Date(this.#createdAt); }
    async verifyPassword(plain) {
        return argon2.verify(this.#passwordHash,plain);
    }
toRecord(){
return {
            id: this.#id,
            username: this.#username,
            passwordHash: this.#passwordHash,
            createdAt: this.#createdAt,
        };
}
toJSON() {
        return {
            id: this.#id,
            username: this.#username,
            createdAt: this.#createdAt,
        };
    }

}
