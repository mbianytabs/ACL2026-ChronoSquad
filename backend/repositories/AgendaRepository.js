import { Agenda } from "../models/Agenda.js";
import { getDatabase } from "../storage/SQLiteDatabase.js";

function toAgenda(row) {
    return row ? new Agenda(row.id, row.name, row.owner_id, row.color, row.created_at) : null;
}

export class AgendaRepository {
    constructor(db = getDatabase()) { this.db = db; }

    async findById(id) {
        return toAgenda(this.db.get("SELECT * FROM agenda WHERE id = ?", [id]));
    }

    async findByOwner(ownerId) {
        return this.db.all("SELECT * FROM agenda WHERE owner_id = ? ORDER BY created_at, id", [ownerId]).map(toAgenda);
    }

    async update(agenda) {
        const result = this.db.run("UPDATE agenda SET name = ?, color = ? WHERE id = ?",
            [agenda.name, agenda.color, agenda.id]);
        return result.changes ? this.findById(agenda.id) : null;
    }

    async create(agenda) {
        return this.db.transaction(() => {
            // IDs simples ; les anciens IDs textuels restent compatibles avec le front.
            const id = agenda.id ?? String(this.db.get("SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS id FROM agenda").id);
            this.db.run("INSERT INTO agenda (id, name, color, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
                [id, agenda.name, agenda.color, agenda.ownerId, agenda.createdAt.toISOString()]);
            return toAgenda(this.db.get("SELECT * FROM agenda WHERE id = ?", [id]));
        });
    }
}
