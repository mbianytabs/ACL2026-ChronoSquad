
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
        const conditions = ["agenda.owner_id = ?"];
        const params = [ownerId];

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
