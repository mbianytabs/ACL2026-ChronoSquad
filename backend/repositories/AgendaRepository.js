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

    async hasAccess(id, userId) {
        return Boolean(this.db.get(`SELECT id FROM agenda
            WHERE id = ? AND (owner_id = ? OR EXISTS (
                SELECT 1 FROM partage WHERE partage.agenda_id = agenda.id AND partage.user_id = ?
            ))`, [id, userId, userId]));
    }

    async findAccessible(userId) {
        const rows = this.db.all(`SELECT agenda.*, user.username AS owner_name
            FROM agenda JOIN user ON user.id = agenda.owner_id
            WHERE agenda.owner_id = ? OR EXISTS (
                SELECT 1 FROM partage WHERE partage.agenda_id = agenda.id AND partage.user_id = ?
            ) ORDER BY agenda.created_at, agenda.id`, [userId, userId]);
        const result = [];
        for (const row of rows) {
            const agenda = toAgenda(row).toJSON();
            agenda.ownerName = row.owner_name;
            agenda.sharedWith = [];
            if (row.owner_id === userId) {
                const partages = await this.findPartages(row.id);
                agenda.sharedWith = partages.map(user => user.username);
            }
            result.push(agenda);
        }
        return result;
    }

    async findPartages(agendaId) {
        return this.db.all(`SELECT user.id, user.username FROM partage
            JOIN user ON user.id = partage.user_id
            WHERE partage.agenda_id = ? ORDER BY user.username`, [agendaId]);
    }

    async addPartage(agendaId, userId) {
        const result = this.db.run(`INSERT INTO partage (agenda_id, user_id) VALUES (?, ?)
            ON CONFLICT (agenda_id, user_id) DO NOTHING`, [agendaId, userId]);
        return result.changes > 0;
    }

    async removePartage(agendaId, username) {
        return this.db.run(`DELETE FROM partage WHERE agenda_id = ?
            AND user_id = (SELECT id FROM user WHERE username = ?)`, [agendaId, username]).changes > 0;
    }

    async delete(id) {
        return this.db.transaction(() => {
            this.db.run("DELETE FROM evenement WHERE agenda_id = ?", [id]);
            return this.db.run("DELETE FROM agenda WHERE id = ?", [id]).changes > 0;
        });
    }

    async update(agenda) {
        const result = this.db.run("UPDATE agenda SET name = ?, color = ? WHERE id = ?",
            [agenda.name, agenda.color, agenda.id]);
        return result.changes ? this.findById(agenda.id) : null;
    }

    async create(agenda) {
        return this.db.transaction(() => {
            const id = agenda.id ?? String(this.db.get("SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS id FROM agenda").id);
            this.db.run("INSERT INTO agenda (id, name, color, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
                [id, agenda.name, agenda.color, agenda.ownerId, agenda.createdAt.toISOString()]);
            return toAgenda(this.db.get("SELECT * FROM agenda WHERE id = ?", [id]));
        });
    }
}
