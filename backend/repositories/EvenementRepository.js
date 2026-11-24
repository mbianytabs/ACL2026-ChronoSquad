
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
        row.recurrence_end_date ?? null,
        Boolean(row.all_day)
    );
}

function toException(row) {
    return {
        occurrenceStart: row.occurrence_start,
        cancelled: Boolean(row.cancelled),
        title: row.title,
        start: row.start,
        end: row.end,
        location: row.location,
        description: row.description
    };
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
        return this.db.transaction(() => this.insert(evenement));
    }

    insert(evenement, agendaId = evenement.agendaId) {
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
                recurrence_end_date,
                all_day
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                agendaId,
                evenement.title,
                evenement.start.toISOString(),
                evenement.end.toISOString(),
                evenement.description,
                evenement.location,
                evenement.recurrenceFrequency ?? null,
                evenement.recurrenceEndDate ?? null,
                evenement.allDay ? 1 : 0
            ]
        );

        return toEvenement(
            this.db.get(
                "SELECT * FROM evenement WHERE id = ?",
                [id]
            )
        );
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

    async findAccessible(userId) {
        return this.db.all(`SELECT evenement.* FROM evenement
            JOIN agenda ON agenda.id = evenement.agenda_id
            WHERE agenda.owner_id = ? OR EXISTS (
                SELECT 1 FROM partage WHERE partage.agenda_id = agenda.id AND partage.user_id = ?
            ) ORDER BY evenement.start, evenement.id`, [userId, userId]).map(toEvenement);
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
                 recurrence_end_date = ?,
                 all_day = ?
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
                evenement.allDay ? 1 : 0,
                id
            ]
        );

        return result.changes ? this.findById(id) : null;
    }

    /** Change l'agenda d'un événement (série entière). Synchrone : utilisable dans une transaction. */
    moveToAgenda(id, agendaId) {
        this.db.run(
            "UPDATE evenement SET agenda_id = ? WHERE id = ?",
            [agendaId, id]
        );
        return toEvenement(
            this.db.get("SELECT * FROM evenement WHERE id = ?", [id])
        );
    }

    /** Copie un événement (et ses exceptions) dans un agenda. Synchrone : utilisable dans une transaction. */
    duplicateToAgenda(evenement, agendaId) {
        const copie = this.insert(new Evenement(
            null,
            agendaId,
            evenement.title,
            evenement.start,
            evenement.end,
            evenement.description,
            evenement.location,
            evenement.recurrenceFrequency,
            evenement.recurrenceEndDate,
            evenement.allDay
        ), agendaId);
        for (const exception of this.findExceptions(evenement.id)) {
            this.saveException(copie.id, exception);
        }
        return copie;
    }

    async delete(id) {
        return this.db.run(
            "DELETE FROM evenement WHERE id = ?",
            [id]
        ).changes > 0;
    }
    // --- Exceptions de récurrence (occurrences supprimées ou modifiées) ---

    findExceptions(evenementId) {
        return this.findExceptionsByEvenement([evenementId]).get(evenementId) ?? [];
    }

    /** Renvoie une Map evenementId -> liste d'exceptions. */
    findExceptionsByEvenement(evenementIds) {
        const map = new Map();
        const ids = [...new Set(evenementIds)];
        // Découpage pour rester sous la limite de paramètres SQLite.
        for (let i = 0; i < ids.length; i += 500) {
            const lot = ids.slice(i, i + 500);
            const rows = this.db.all(
                `SELECT * FROM evenement_exception
                 WHERE evenement_id IN (${lot.map(() => "?").join(", ")})
                 ORDER BY occurrence_start`,
                lot
            );
            for (const row of rows) {
                if (!map.has(row.evenement_id)) map.set(row.evenement_id, []);
                map.get(row.evenement_id).push(toException(row));
            }
        }
        return map;
    }

    /**
     * Enregistre la suppression (`cancelled`) ou la modification d'une
     * occurrence, identifiée par son début d'origine.
     */
    saveException(evenementId, exception) {
        this.db.run(
            `INSERT INTO evenement_exception (
                evenement_id, occurrence_start, cancelled,
                title, start, end, location, description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (evenement_id, occurrence_start) DO UPDATE SET
                cancelled = excluded.cancelled,
                title = excluded.title,
                start = excluded.start,
                end = excluded.end,
                location = excluded.location,
                description = excluded.description`,
            [
                evenementId,
                new Date(exception.occurrenceStart).toISOString(),
                exception.cancelled ? 1 : 0,
                exception.cancelled ? null : exception.title,
                exception.cancelled ? null : new Date(exception.start).toISOString(),
                exception.cancelled ? null : new Date(exception.end).toISOString(),
                exception.cancelled ? null : (exception.location ?? ""),
                exception.cancelled ? null : (exception.description ?? "")
            ]
        );
        return this.findExceptions(evenementId)
            .find(e => e.occurrenceStart === new Date(exception.occurrenceStart).toISOString());
    }

    deleteException(evenementId, occurrenceStart) {
        return this.db.run(
            "DELETE FROM evenement_exception WHERE evenement_id = ? AND occurrence_start = ?",
            [evenementId, new Date(occurrenceStart).toISOString()]
        ).changes > 0;
    }

    /** Supprime les exceptions qui ne correspondent plus à une occurrence de la série. */
    pruneExceptions(evenement, estOccurrence) {
        for (const exception of this.findExceptions(evenement.id)) {
            if (!estOccurrence(evenement, exception.occurrenceStart)) {
                this.deleteException(evenement.id, exception.occurrenceStart);
            }
        }
    }

   /**
    * Sèlectionne les èvenemnts candidats à une recherche pour un utilisateur donné
    * @param {*} ownerId Identifiant de l'utilisateur authentifié
    * @param {*} param1 parametres de recherche 
    */ 
   async findSearchCandidates(ownerId, {
        query = "", //texte recherché
        agendaIds = [], //tableaux des identifiants des agendas sélectionnés 
        startDate = null,
       endDate = null
    } = {}) {
        const conditions = [`(agenda.owner_id = ? OR EXISTS (
            SELECT 1 FROM partage WHERE partage.agenda_id = agenda.id AND partage.user_id = ?
        ))`];
        const params = [ownerId, ownerId];

        const text = query.trim();

        //la recherche textuelle
        if (text) {//on recherche une sous-chaîne dans une autre chaîne
            //on garde si le texte apparaît dans au moins un des trois champs
            conditions.push(`(
                instr(lower(evenement.title), lower(?)) > 0
               OR instr(lower(evenement.description), lower(?)) > 0
               OR instr(lower(evenement.location), lower(?)) > 0
            )`);
            params.push(text, text, text);
        }
        //la recherche dans un ou plusieurs agendas
        //si le tableau est vide , la recherche porte sur tous les agendas appartenant
        //à l'utlisateur, aucune restriction n'est rajoutée sur la recherche 
        if (agendaIds.length > 0) {
            const placeholders = agendaIds.map(() => "?").join(", ");
            conditions.push(`evenement.agenda_id IN (${placeholders})`);
           params.push(...agendaIds);
        }

        //la recherche par periode
        //on retrouve les événements qui chevauchent la période demandée
        //et pas uniquement ceux qui commencent à l'intérieur

         if (startDate) {
            //Inclut les événements chevauchant le début de période
            //fin événement > début période
           //Les événements récurrents seront vérifiés occurrence par occurrence
            conditions.push(`(
                evenement.end > ?
                OR evenement.recurrence_frequency IS NOT NULL
            )`);
            params.push(`${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
            //début événement < fin période
            //La fin est inclusive : borne SQL exclusive au lendemain 00:00 UTC.
           const lendemain = new Date(`${endDate}T00:00:00.000Z`);
            lendemain.setUTCDate(lendemain.getUTCDate() + 1);
            conditions.push("evenement.start < ?");
            params.push(lendemain.toISOString());
        }

        const rows = this.db.all(
            `SELECT evenement.*
            FROM evenement
            JOIN agenda ON agenda.id = evenement.agenda_id
            WHERE ${conditions.join(" AND ")}
            ORDER BY evenement.start, evenement.id`,
            params
        );

        return rows.map(toEvenement);
    }

}
