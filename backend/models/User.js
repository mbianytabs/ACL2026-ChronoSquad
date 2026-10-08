/**
 * Classe qui represente un utilisateur
 */

export class User{
    #id;
    #username;
    #passwordHash;
    #createdAt;
    #agendas = [];
    /**
     * Constructeur
     * @param {*} id -identifiant unique
     * @param {*} name - nom
     * @param {*} pwd - mot de passe
     */
    constructor(id, name, pwd){
        this.#id = id;
        this.#username = name;
        this.#passwordHash = pwd;
        this.#createdAt = new Date ();
    }

     get id() {
        return this.#id;
    }

    get username() {
        return this.#username;
    }
/**
     * Compare un hash fourni avec celui de l'utilisateur
     * @param {string} hash
     * @returns {boolean}
     */
    hasPasswordHash(hash) {
        return argon2.verify(this.#passwordHash, hash);
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