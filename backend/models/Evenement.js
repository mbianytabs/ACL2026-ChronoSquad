/**
 * Classe qui représente un evenement 
 */


export class Evenement{
    #id;
    #agendaId;
    #title;
    #start;
    #end;
    #description;
    #location;
    /**
     * 
     * @param {*} id  
     * @param {*}agenda
     * @param {*} title 
     * @param {*} start 
     * @param {*} end 
     * @param {*} description 
     * @param location
     */
    constructor(id, agendaId,title, start, end, description="" , location=""){
        if (!id || !agendaId) {
            throw new Error("id et agendaId sont obligatoires");
        }

        Evenement.#validateTitle(title);
        Evenement.#validateDates(start, end);
        
        this.#id = id;
        this.#agendaId = agendaId;
        this.#title = title.trim();//suppression des espaces et des caractères blancs
        this.#start = new Date(start);
        this.#end = new Date(end);
        this.#description = description;
        this.#location = location;
    }

    //getters
    get id() { return this.#id; }
    get agendaId() { return this.#agendaId; }
    get title() { return this.#title; }
    get start() { return new Date(this.#start); }
    get end() { return new Date(this.#end); }
    get description() { return this.#description; }
    get location() { return this.#location; }

//Validation
static #validateTitle(title) {
    if (typeof title !== "string" || title.trim().length === 0) {
        throw new Error("Le titre est obligatoire");
    }
}
static #validateDates(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e)) throw new Error("Dates invalides");
    if (e <= s) throw new Error("La fin doit être postérieure au début");
}

// Modifications d'un évenements
    /**
     * Renommage du titre d'un évenement
     * @param {*} nouveauTitre 
     */
    rename(nouveauTitre){
         Evenement.#validateTitle(nouveauTitre);
            this.#title = nouveauTitre.trim();
    }
    /**
     * Modification heure debut et fin d'un évenement
     */
    newSchedule(newStart, newEnd){
        Evenement.#validateDates(newStart,newEnd);
        this.#start = new Date(newStart);
        this.#end = new Date(newEnd);
    }
    /**
     * Mise à jour de la description d'un èvenement
     * @param {} text 
     */
    setDescription(text){
        this.#description = text;
    }
    /**
     * Mise à jour de la location d'un èvenement
     * @param {*} text 
     */
    setLocation(text){
        this.#location = text;
    }
    /**
     * 
     * @returns la duree d'un évenement+
     */
    getDuration(){
        return (this.#end - this.#start) / 60000;
    }
    /**
     * Sérialisation
     */
     toJSON() {
        return {
            id: this.#id,
            agendaId: this.#agendaId ,
            title: this.#title,
            start: this.#start,
            end: this.#end,
            description: this.#description,
            location: this.#location,
        };
    }
}