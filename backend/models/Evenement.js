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
    /**
     * 
     * @param {*} id 
     * @param {*} agendaId 
     * @param {*} title 
     * @param {*} start 
     * @param {*} end 
     * @param {*} description 
     */
    constructor(id, agendaId, title, start, end, description="" ){
        this.#id = id;
        this.#agendaId = agendaId;
        this.#title = title.trim();//suppression des espaces et des caractères blancs
        this.#start = new Date(start);
        this.#end = new Date(end);
        this.#description = description;
    }

    //getters
    get id() { return this.#id; }
    get agendaId() { return this.#agendaId; }
    get title() { return this.#title; }
    get start() { return new Date(this.#start); }
    get end() { return new Date(this.#end); }
    get description() { return this.#description; }

// Modifications d'un évenements
    /**
     * Renommage du titre d'un évenement
     * @param {*} nouveauTitre 
     */
    rename(nouveauTitre){
            this.#title = nouveauTitre.trim();
    }
    /**
     * Modification heure debut et fin d'un évenement
     */
    newSchedule(){
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
            agendaId: this.#agendaId,
            title: this.#title,
            start: this.#start,
            end: this.#end,
            description: this.#description,
        };
    }
}