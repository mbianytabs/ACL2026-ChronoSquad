

export class Evenement{
    #id;
    #agendaId;
    #title;
    #start;
    #end;
    #description;
    #location;
    #recurrenceFrequency;
    #recurrenceEndDate;
    constructor(id, agendaId,title, start, end, description="" , location="",recurrenceFrequency = null,recurrenceEndDate = null){
        if ((id !== null && !id) || !agendaId) {
            throw new Error("id et agendaId sont obligatoires");
        }

        Evenement.#validateTitle(title);
        Evenement.#validateDates(start, end);
         const recurrence = Evenement.#validateRecurrence(
            start,
            recurrenceFrequency,
            recurrenceEndDate
        );

        this.#id = id;
        this.#agendaId = agendaId;
        this.#title = title.trim();
        this.#start = new Date(start);
        this.#end = new Date(end);
        this.#description = description;
        this.#location = location;
         this.#recurrenceFrequency = recurrence.frequency;
        this.#recurrenceEndDate = recurrence.endDate;
    }

    get id() { return this.#id; }
    get agendaId() { return this.#agendaId; }
    get title() { return this.#title; }
    get start() { return new Date(this.#start); }
    get end() { return new Date(this.#end); }
    get description() { return this.#description; }
    get location() { return this.#location; }

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

static #validateRecurrence(start, frequency, endDate) {
        const allowedFrequencies = ["daily", "weekly", "monthly", "yearly"];

        if (frequency === null || frequency === undefined || frequency === "") {
            if (endDate !== null && endDate !== undefined && endDate !== "") {
                throw new Error(
                    "Une date de fin de récurrence nécessite une fréquence"
                );
            }

            return { frequency: null, endDate: null };
        }

        if (!allowedFrequencies.includes(frequency)) {
            throw new Error(
                "La fréquence doit être quotidienne , hebdomadaire , mensuelle ou annuelle"
            );
        }

        if (endDate === null || endDate === undefined || endDate === "") {
            return { frequency, endDate: null };
        }

        if (typeof endDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            throw new Error("La date de fin doit respecter le format YYYY-MM-DD");
        }

        const parsedEndDate = new Date(`${endDate}T00:00:00.000Z`);

        if (Number.isNaN(parsedEndDate.getTime()) ||
            parsedEndDate.toISOString().slice(0, 10) !== endDate) {
            throw new Error("La date de fin de récurrence est invalide");
        }

        const startDate = new Date(start).toISOString().slice(0, 10);

        if (endDate < startDate) {
            throw new Error(
                "La fin de récurrence ne peut pas précéder le début du rendez-vous"
            );
        }

        return { frequency, endDate };
    }

    rename(nouveauTitre){
         Evenement.#validateTitle(nouveauTitre);
            this.#title = nouveauTitre.trim();
    }
    newSchedule(newStart, newEnd){
        Evenement.#validateDates(newStart,newEnd);
        this.#start = new Date(newStart);
        this.#end = new Date(newEnd);
    }
    setDescription(text){
        this.#description = text;
    }
    setLocation(text){
        this.#location = text;
    }
    getDuration(){
        return (this.#end - this.#start) / 60000;
    }
     toJSON() {
        return {
            id: this.#id,
            agendaId: this.#agendaId ,
            title: this.#title,
            start: this.#start,
            end: this.#end,
            description: this.#description,
            location: this.#location,
            recurrenceFrequency: this.#recurrenceFrequency,
            recurrenceEndDate: this.#recurrenceEndDate
        };
    }

    get recurrenceFrequency() {
    return this.#recurrenceFrequency;
    }

    get recurrenceEndDate() {
        return this.#recurrenceEndDate;
    }

}
