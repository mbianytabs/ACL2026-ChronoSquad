import { Evenement } from "../models/Evenement.js";
import { getDatabase } from "../storage/SQLiteDatabase.js";

function toEvenement(row) {
    return row ? new Evenement(row.id, row.agenda_id, row.title, row.start, row.end, row.description, row.location) : null;
}

export class EvenementRepository {
    constructor(db = getDatabase()) { this.db = db; }

    async findById(id) {
        return toEvenement(this.db.get("SELECT * FROM evenement WHERE id = ?", [id]));
    }

    async findByAgenda(agendaId) {
        return this.db.all("SELECT * FROM evenement WHERE agenda_id = ? ORDER BY start, id", [agendaId]).map(toEvenement);
    }

    async create(evenement) {
        return this.db.transaction(() => {
            const id = evenement.id ?? String(this.db.get("SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS id FROM evenement").id);
            this.db.run(`INSERT INTO evenement (id, agenda_id, title, start, end, description, location)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, evenement.agendaId, evenement.title, evenement.start.toISOString(),
                    evenement.end.toISOString(), evenement.description, evenement.location]);
            return toEvenement(this.db.get("SELECT * FROM evenement WHERE id = ?", [id]));
        });
    }

    async findByOwner(ownerId) {
        return this.db.all(`SELECT evenement.* FROM evenement
            JOIN agenda ON agenda.id = evenement.agenda_id
            WHERE agenda.owner_id = ? ORDER BY evenement.start, evenement.id`, [ownerId]).map(toEvenement);
    }

    async update(id, evenement) {
        const result = this.db.run(`UPDATE evenement SET agenda_id = ?, title = ?, start = ?, end = ?,
            description = ?, location = ? WHERE id = ?`,
            [evenement.agendaId, evenement.title, evenement.start.toISOString(), evenement.end.toISOString(),
                evenement.description, evenement.location, id]);
        return result.changes ? this.findById(id) : null;
    }

    async delete(id) {
        return this.db.run("DELETE FROM evenement WHERE id = ?", [id]).changes > 0;
    }
}
