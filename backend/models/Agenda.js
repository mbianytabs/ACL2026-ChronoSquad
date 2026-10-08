/**
 * Classe qui gère un agenda
 */

export class Agenda{
    #id;
    #name;
    #color;
    #ownerId;
    #createdAt;
    /**
     * constructeur
     * @param {*} id 
     * @param {*} name 
     * @param {*} ownerId 
     * @param {*} color 
     */
    constructor(id, name,ownerId, color = "#3b82f6",createdAt = new Date()){
       
        if (!id || !ownerId) {
            throw new Error("id et ownerId sont obligatoires");
        }
        Agenda.#validateName(name);
        Agenda.#validateColor(color); 
        this.#id = id;
        this.#name = name.trim();
        this.#ownerId = ownerId;
        this.#color = color;
        this.#createdAt = new Date(createdAt);
    }

    //Getters

    get id() { return this.#id; }
    get name() { return this.#name; }
    get color() { return this.#color; }
    get ownerId() { return this.#ownerId; }
    get createdAt() { return new Date(this.#createdAt); }

    //Validation 
    static #validateName(name) {
    if (typeof name !== "string" || name.trim().length === 0) {
        throw new Error("Le nom de l'agenda est obligatoire");
    }
    }
    static #validateColor(color) {
        if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
            throw new Error("La couleur doit être au format #RRGGBB");
        }
    }
    
    /**
     * Modifie le nom 
     * @param {*} newName 
     */
    rename(newName){
        //à valider
        Agenda.#validateName(newName);
        this.#name = newName.trim();
    }
    /**
     * Change de couleur
     * @param {*} newColor 
     */
    changeColor(newColor) {
        //à valider
        Agenda.#validateColor(newColor);
        this.#color = newColor;
    }
    
    /**
     * sérialisation
     * @returns 
     */
    toJSON() {
        return {
            id: this.#id,
            name: this.#name,
            color: this.#color,
            ownerId: this.#ownerId,
            createdAt: this.#createdAt,
        };
    }
}