import createError from "http-errors";
import { Evenement } from "../models/Evenement.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";
import { RecurrenceService } from "../services/RecurrenceService.js";
import { evenementChevauchePeriode } from "../services/RechercheService.js";


function readEvenement(body, id, agendaId, allDay = false) {
    if (
        typeof body?.title !== "string" ||
        typeof body?.start !== "string" ||
        typeof body?.end !== "string" ||
        (body.location !== undefined &&
            typeof body.location !== "string") ||
        (body.description !== undefined &&
            typeof body.description !== "string") ||
        (body.recurrenceFrequency !== undefined &&
            body.recurrenceFrequency !== null &&
            typeof body.recurrenceFrequency !== "string") ||
        (body.recurrenceEndDate !== undefined &&
            body.recurrenceEndDate !== null &&
            typeof body.recurrenceEndDate !== "string") ||
        (body.allDay !== undefined && typeof body.allDay !== "boolean")
    ) {
        throw createError(
            400,
            "Titre et dates requis ; les autres champs doivent respecter leur format."
        );
    }

    try {
        return new Evenement(
            id,
            agendaId,
            body.title,
            body.start,
            body.end,
            body.description,
            body.location,
            body.recurrenceFrequency ?? null,
            body.recurrenceEndDate ?? null,
            body.allDay ?? allDay
        );
    } catch (error) {
        throw createError(400, error.message);
    }
}


async function findAccessibleEvenement(req, evenements) {
    const evenement = await evenements.findById(req.params.id);
    if (!evenement) {
        throw createError(404, "Événement introuvable.");
    }
    const agendas = new AgendaRepository(req.app.locals.database);
    if (!await agendas.hasAccess(evenement.agendaId, req.user.id)) {
        throw createError(404, "Événement introuvable.");
    }
    return evenement;
}
const MAX_LOT = 500;

/**
 * Lit { ids, agendaId } pour un déplacement / une duplication groupée :
 * chaque événement et l'agenda cible doivent être accessibles.
 */
async function readLot(req) {
    const ids = req.body?.ids;
    const agendaId = req.body?.agendaId;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_LOT ||
        ids.some(id => typeof id !== "string" || !id.trim())) {
        throw createError(400, `Sélectionnez entre 1 et ${MAX_LOT} événements.`);
    }
    if (typeof agendaId !== "string" || !agendaId.trim()) {
        throw createError(400, "Agenda invalide.");
    }
    const agendas = new AgendaRepository(req.app.locals.database);
    const cible = await agendas.findById(agendaId);
    if (!cible || !await agendas.hasAccess(cible.id, req.user.id)) {
        throw createError(404, "Agenda introuvable.");
    }
    const repo = new EvenementRepository(req.app.locals.database);
    const evenements = [];
    for (const id of new Set(ids)) {
        const evenement = await repo.findById(id);
        if (!evenement || !await agendas.hasAccess(evenement.agendaId, req.user.id)) {
            throw createError(404, "Événement introuvable.");
        }
        evenements.push(evenement);
    }
    return { evenements, cible, repo };
}

/** Valide le parametre HTTP
 * Paramètre HTTP facultatif 
 *  soit une chaîne, soit une erreur 400.
 *  */
function readTextParameter(value, name) {
    if (value === undefined) return "";
    if (typeof value !== "string") {
        throw createError(400, `Le paramètre ${name} doit être un texte.`);
    }
    return value.trim();
}
/**
 * valide le format et la validité d'une date 
 * @param {*} value 
 * @param {*} name 
 * @returns 
 */
function readSearchDate(value, name) {
    const text = readTextParameter(value, name);
    if (!text) return null;

    const date = new Date(`${text}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== text) {
        throw createError(400, `Le paramètre ${name} doit être une date valide YYYY-MM-DD.`);
    }
    return text;
}
/**
 * récupére et transforme une liste d'agendas
 * @param {*} value 
 * @returns 
 */
function readAgendaIds(value) {
    if (value === undefined || value === "") return [];

    //Formats acceptés : agendaIds=a1,a2 et agendaIds=a1&agendaIds=a2.
    const values = Array.isArray(value) ? value : [value];
    if (values.some(item => typeof item !== "string")) {
        throw createError(400, "Le paramètre agendaIds est invalide.");
    }
    const ids = values.flatMap(item => item.split(","))
        .map(item => item.trim());
    if (ids.some(id => !id) || ids.length > 100) {
        throw createError(400, "Le paramètre agendaIds est invalide (maximum 100 agendas).");
    }
    return [...new Set(ids)];
}

// Une même requête ne peut pas couvrir plus de 10 ans d'occurrences.
const MAX_PERIODE_MS = 3660 * 24 * 60 * 60 * 1000;

function readPeriodDate(value, name) {
    if (value === undefined || value === "") return null;
    if (typeof value !== "string") {
        throw createError(400, `Le paramètre ${name} doit être une date.`);
    }
    // YYYY-MM-DD (minuit UTC) ou date-heure ISO 8601 complète.
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00.000Z`)
        : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)
            ? new Date(value)
            : new Date(NaN);
    if (Number.isNaN(date.getTime())) {
        throw createError(400, `Le paramètre ${name} doit être une date ISO valide.`);
    }
    return date;
}

/** Lit la période consultée : start inclus, end exclu. */
function readPeriode(query) {
    const debut = readPeriodDate(query.start, "start");
    const fin = readPeriodDate(query.end, "end");
    if (debut && fin) {
        if (fin <= debut) {
            throw createError(400, "La fin de la période doit être postérieure à son début.");
        }
        if (fin - debut > MAX_PERIODE_MS) {
            throw createError(400, "La période demandée ne doit pas dépasser 10 ans.");
        }
    }
    return { debut, fin };
}

/** Lit l'identifiant d'occurrence (son début d'origine) et vérifie qu'il existe. */
function readOccurrenceStart(req, serie) {
    if (!serie.recurrenceFrequency) {
        throw createError(400, "Cet événement n'est pas récurrent.");
    }
    const date = new Date(req.params.occurrenceStart);
    if (Number.isNaN(date.getTime()) || !RecurrenceService.estOccurrence(serie, date)) {
        throw createError(404, "Occurrence introuvable.");
    }
    return date.toISOString();
}

function occurrenceJSON(occurrence, evenementId) {
    return {
        ...(evenementId ? { evenementId } : {}),
        occurrenceStart: occurrence.occurrenceStart.toISOString(),
        start: occurrence.debut.toISOString(),
        end: occurrence.fin.toISOString(),
        title: occurrence.title,
        description: occurrence.description,
        location: occurrence.location,
        modified: occurrence.modifiee
    };
}

export class EvenementController {
    static async getEvenements(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        res.json(await evenements.findAccessible(req.user.id));
    }

    static async createEvenement(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(req.params.agendaId);
        if (!agenda || !await agendas.hasAccess(agenda.id, req.user.id)) {
            throw createError(404, "Agenda introuvable.");
        }

        const evenement = readEvenement(req.body, null, agenda.id);
        const evenements = new EvenementRepository(req.app.locals.database);
        res.status(201).json(await evenements.create(evenement));
    }

    static async updateEvenement(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        const current = await findAccessibleEvenement(req, evenements);
        const agendaId = req.body?.agendaId ?? current.agendaId;
        if (typeof agendaId !== "string" || !agendaId.trim()) {
            throw createError(400, "Agenda invalide.");
        }
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(agendaId);
        if (!agenda || !await agendas.hasAccess(agenda.id, req.user.id)) {
            throw createError(404, "Agenda introuvable.");
        }
        const evenement = readEvenement(req.body, current.id, agenda.id, current.allDay);
        const updated = await evenements.update(current.id, evenement);
        if (!updated) {
            throw createError(404, "Événement introuvable.");
        }
        // Si la série change (début, fréquence, fin), les occurrences
        // modifiées ou supprimées qui n'existent plus sont oubliées.
        evenements.pruneExceptions(updated, (serie, date) => RecurrenceService.estOccurrence(serie, date));
        res.json(updated);
    }

    /** POST /evenements/deplacer { ids, agendaId } : déplace des événements (séries entières). */
    static async deplacerEvenements(req, res) {
        const { evenements, cible, repo } = await readLot(req);
        const db = req.app.locals.database;
        const moved = db.transaction(() =>
            evenements.map(ev => ev.agendaId === cible.id ? ev : repo.moveToAgenda(ev.id, cible.id)));
        res.json({ evenements: moved });
    }

    /** POST /evenements/dupliquer { ids, agendaId } : duplique des événements dans un agenda. */
    static async dupliquerEvenements(req, res) {
        const { evenements, cible, repo } = await readLot(req);
        const db = req.app.locals.database;
        const copies = db.transaction(() =>
            evenements.map(ev => repo.duplicateToAgenda(ev, cible.id)));
        res.status(201).json({ evenements: copies });
    }

    static async deleteEvenement(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        const evenement = await findAccessibleEvenement(req, evenements);
        if (!await evenements.delete(evenement.id)) {
            throw createError(404, "Événement introuvable.");
        }
        res.status(204).end();
    }

    
    /**
     * GET /evenements/:id/occurrences?start=ISO&end=ISO
     * Génère les occurrences qui chevauchent la période consultée
     * (fin exclusive), exceptions comprises. La période est obligatoire
     * pour une récurrence sans date de fin.
     */
    static async getOccurrences(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        const evenement = await findAccessibleEvenement(req, evenements);
        const { debut, fin } = readPeriode(req.query);

        let occurrences;
        try {
            occurrences = RecurrenceService.genererOccurrences(evenement, {
                debut,
                fin,
                exceptions: evenements.findExceptions(evenement.id)
            });
        } catch (error) {
            throw createError(400, error.message);
        }

        res.json({
            evenementId: evenement.id,
            occurrences: occurrences.map(occurrenceJSON)
        });
    }

    /**
     * PUT /evenements/:id/occurrences/:occurrenceStart
     * Modifie une seule occurrence d'une série (la série reste inchangée).
     */
    static async updateOccurrence(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        const serie = await findAccessibleEvenement(req, evenements);
        const occurrenceStart = readOccurrenceStart(req, serie);

        if (req.body?.recurrenceFrequency || req.body?.recurrenceEndDate) {
            throw createError(400, "Une occurrence ne peut pas avoir sa propre récurrence.");
        }
        if (req.body?.agendaId !== undefined && req.body.agendaId !== serie.agendaId) {
            throw createError(400, "Une occurrence reste dans l'agenda de sa série.");
        }
        // Valide les champs avec les mêmes règles qu'un événement simple.
        const valide = readEvenement(
            { ...req.body, recurrenceFrequency: null, recurrenceEndDate: null },
            serie.id,
            serie.agendaId,
            serie.allDay
        );
        if (valide.allDay !== serie.allDay) {
            throw createError(400, "Une occurrence doit garder le type « journée entière » de sa série.");
        }

        evenements.saveException(serie.id, {
            occurrenceStart,
            cancelled: false,
            title: valide.title,
            start: valide.start,
            end: valide.end,
            description: valide.description ?? "",
            location: valide.location ?? ""
        });

        res.json(occurrenceJSON({
            occurrenceStart: new Date(occurrenceStart),
            debut: valide.start,
            fin: valide.end,
            title: valide.title,
            description: valide.description ?? "",
            location: valide.location ?? "",
            modifiee: true
        }, serie.id));
    }

    /**
     * DELETE /evenements/:id/occurrences/:occurrenceStart
     * Supprime une seule occurrence d'une série.
     */
    static async deleteOccurrence(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        const serie = await findAccessibleEvenement(req, evenements);
        const occurrenceStart = readOccurrenceStart(req, serie);
        evenements.saveException(serie.id, { occurrenceStart, cancelled: true });
        res.status(204).end();
    }

    /**
     * DELETE /evenements/:id/occurrences/:occurrenceStart/exception
     * Annule la modification ou la suppression d'une occurrence.
     */
    static async restoreOccurrence(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        const serie = await findAccessibleEvenement(req, evenements);
        const occurrenceStart = readOccurrenceStart(req, serie);
        if (!evenements.deleteException(serie.id, occurrenceStart)) {
            throw createError(404, "Cette occurrence n'a pas été modifiée.");
        }
        res.status(204).end();
    }

    /**
     * Valide les données pour la recherche des événements
     * @param {*} req la requete
     * @param {*} res les resultats
     */
    static async searchEvenements(req, res) {
        //q représente le texte cherché
    const query = readTextParameter(req.query.q, "q");

    if (query.length > 200) {
        throw createError(
            400,
            "Le paramètre q ne doit pas dépasser 200 caractères."
        );
    }

    const agendaIds = readAgendaIds(req.query.agendaIds);
    const startDate = readSearchDate(req.query.startDate, "startDate");
    const endDate = readSearchDate(req.query.endDate, "endDate");

    if (startDate && endDate && startDate > endDate) {
        throw createError(
            400,
            "La date de début doit précéder la date de fin."
        );
    }

    const evenements = new EvenementRepository(
        req.app.locals.database
    );

    //SQL sélectionne les candidats 
    const candidats = await evenements.findSearchCandidates(
        req.user.id,
        { query, agendaIds, startDate, endDate }
    );

    
    //Le service recherche vérifie que les récurrences ont réellement une occurrence dans la période demandée
    const exceptions = (startDate || endDate)
        ? evenements.findExceptionsByEvenement(
            candidats.filter(e => e.recurrenceFrequency).map(e => e.id)
        )
        : new Map();
    const resultats = candidats.filter(evenement =>
        evenementChevauchePeriode(
            evenement, startDate, endDate, exceptions.get(evenement.id) ?? []
        )
    );

    res.json(resultats);
}

}




