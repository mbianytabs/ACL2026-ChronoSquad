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

    async create(agenda) {
        this.db.run("INSERT INTO agenda (id, name, color, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
            [agenda.id, agenda.name, agenda.color, agenda.ownerId, agenda.createdAt.toISOString()]);
        return agenda;
    }
}
