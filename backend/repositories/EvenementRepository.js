import { Evenement } from "../models/Evenement.js";
import { getDatabase } from "../storage/SQLiteDatabase.js";

function toEvenement(row) {
    return row ? new Evenement(row.id, row.agenda_id, row.title, row.start, row.end, row.description, row.location) : null;
}

// Le modèle existant Evenement correspond à la table SQL rendezvous.
export class EvenementRepository {
    constructor(db = getDatabase()) { this.db = db; }

    async findById(id) {
        return toEvenement(this.db.get("SELECT * FROM rendezvous WHERE id = ?", [id]));
    }

    async findByAgenda(agendaId) {
        return this.db.all("SELECT * FROM rendezvous WHERE agenda_id = ? ORDER BY start, id", [agendaId]).map(toEvenement);
    }

    async create(evenement) {
        this.db.run(`INSERT INTO rendezvous (id, agenda_id, title, start, end, description, location)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [evenement.id, evenement.agendaId, evenement.title, evenement.start.toISOString(),
                evenement.end.toISOString(), evenement.description, evenement.location]);
        return evenement;
    }

    async update(id, evenement) {
        const result = this.db.run(`UPDATE rendezvous SET agenda_id = ?, title = ?, start = ?, end = ?,
            description = ?, location = ? WHERE id = ?`,
            [evenement.agendaId, evenement.title, evenement.start.toISOString(), evenement.end.toISOString(),
                evenement.description, evenement.location, id]);
        return result.changes ? this.findById(id) : null;
    }

    async delete(id) {
        return this.db.run("DELETE FROM rendezvous WHERE id = ?", [id]).changes > 0;
    }
}
