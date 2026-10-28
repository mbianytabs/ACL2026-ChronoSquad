
import { Evenement } from "../models/Evenement.js";
import { getDatabase } from "../storage/SQLiteDatabase.js";

function toEvenement(row) {
    if (!row) {
        return null;
    }

    return new Evenement(
        row.id,
        row.agenda_id,
        row.title,
        row.start,
        row.end,
        row.description,
        row.location,
        row.recurrence_frequency ?? null,
        row.recurrence_end_date ?? null
    );
}

export class EvenementRepository {
    constructor(db = getDatabase()) {
        this.db = db;
    }

    async findById(id) {
        const row = this.db.get(
            "SELECT * FROM evenement WHERE id = ?",
            [id]
        );

        return toEvenement(row);
    }

    async findByAgenda(agendaId) {
        const rows = this.db.all(
            `SELECT *
             FROM evenement
             WHERE agenda_id = ?
             ORDER BY start, id`,
            [agendaId]
        );

        return rows.map(toEvenement);
    }

    async create(evenement) {
        return this.db.transaction(() => {
            const id = evenement.id ??
                String(
                    this.db.get(
                        `SELECT COALESCE(
                            MAX(CAST(id AS INTEGER)), 0
                        ) + 1 AS id
                        FROM evenement`
                    ).id
                );

            this.db.run(
                `INSERT INTO evenement (
                    id,
                    agenda_id,
                    title,
                    start,
                    end,
                    description,
                    location,
                    recurrence_frequency,
                    recurrence_end_date
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    evenement.agendaId,
                    evenement.title,
                    evenement.start.toISOString(),
                    evenement.end.toISOString(),
                    evenement.description,
                    evenement.location,
                    evenement.recurrenceFrequency ?? null,
                    evenement.recurrenceEndDate ?? null
                ]
            );

            return toEvenement(
                this.db.get(
                    "SELECT * FROM evenement WHERE id = ?",
                    [id]
                )
            );
        });
    }

    async findByOwner(ownerId) {
        const rows = this.db.all(
            `SELECT evenement.*
             FROM evenement
             JOIN agenda ON agenda.id = evenement.agenda_id
             WHERE agenda.owner_id = ?
             ORDER BY evenement.start, evenement.id`,
            [ownerId]
        );

        return rows.map(toEvenement);
    }

    async update(id, evenement) {
        const result = this.db.run(
            `UPDATE evenement
             SET agenda_id = ?,
                 title = ?,
                 start = ?,
                 end = ?,
                 description = ?,
                 location = ?,
                 recurrence_frequency = ?,
                 recurrence_end_date = ?
             WHERE id = ?`,
            [
                evenement.agendaId,
                evenement.title,
                evenement.start.toISOString(),
                evenement.end.toISOString(),
                evenement.description,
                evenement.location,
                evenement.recurrenceFrequency ?? null,
                evenement.recurrenceEndDate ?? null,
                id
            ]
        );

        return result.changes ? this.findById(id) : null;
    }

    async delete(id) {
        return this.db.run(
            "DELETE FROM evenement WHERE id = ?",
            [id]
        ).changes > 0;
    }
}
