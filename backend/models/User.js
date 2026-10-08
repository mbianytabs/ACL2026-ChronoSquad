/**
 * Classe qui represente un utilisateur
 */
import argon2 from "argon2";

export class User{
    #id;
    #username;
    #passwordHash;
    #createdAt;
    /**
     * Constructeur
     * @param {*} id -identifiant unique
     * @param {*} name - nom
     * @param {*} pwd - mot de passe
     * @param {*} createdAt
     */
    constructor(id, name, pwd,createdAt = new Date()){
         if (!id || !name || !pwd) {
            throw new Error("id, username et passwordHash sont obligatoires");
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
    /**
     * Compare un mot de passe fourni avec celui de l'utilisateur
     * @param {string} hash
     * @returns {boolean}
     */
    async verifyPassword(plain) {
        return argon2.verify(this.#passwordHash,plain);
    }
/**
 * Pour la persistance
 */
toRecord(){
return {
            id: this.#id,
            username: this.#username,
            passwordHash: this.#passwordHash,
            createdAt: this.#createdAt,
        };
}
/**
 * Sérialisation
 */
toJSON() {
        return {
            id: this.#id,
            username: this.#username,
            createdAt: this.#createdAt,
        };
    }

}