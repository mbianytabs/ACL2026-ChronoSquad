import createError from "http-errors";
import { Evenement } from "../models/Evenement.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";
import { RecurrenceService } from "../services/RecurrenceService.js";
import { evenementChevauchePeriode } from "../services/RechercheService.js";


function readEvenement(body, id, agendaId) {
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
            typeof body.recurrenceEndDate !== "string")
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
            body.recurrenceEndDate ?? null
        );
    } catch (error) {
        throw createError(400, error.message);
    }
}


async function findOwnedEvenement(req, evenements) {
    const evenement = await evenements.findById(req.params.id);
    if (!evenement) {
        throw createError(404, "Événement introuvable.");
    }
    const agendas = new AgendaRepository(req.app.locals.database);
    const agenda = await agendas.findById(evenement.agendaId);
    if (!agenda || agenda.ownerId !== req.user.id) {
        throw createError(404, "Événement introuvable.");
    }
    return evenement;
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

export class EvenementController {
    static async getEvenements(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        res.json(await evenements.findByOwner(req.user.id));
    }

    static async createEvenement(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(req.params.agendaId);
        if (!agenda || agenda.ownerId !== req.user.id) {
            throw createError(404, "Agenda introuvable.");
        }

        const evenement = readEvenement(req.body, null, agenda.id);
        const evenements = new EvenementRepository(req.app.locals.database);
        res.status(201).json(await evenements.create(evenement));
    }

    static async updateEvenement(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        const current = await findOwnedEvenement(req, evenements);
        const agendaId = req.body?.agendaId ?? current.agendaId;
        if (typeof agendaId !== "string" || !agendaId.trim()) {
            throw createError(400, "Agenda invalide.");
        }
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(agendaId);
        if (!agenda || agenda.ownerId !== req.user.id) {
            throw createError(404, "Agenda introuvable.");
        }
        const evenement = readEvenement(req.body, current.id, agenda.id);
        const updated = await evenements.update(current.id, evenement);
        if (!updated) {
            throw createError(404, "Événement introuvable.");
        }
        res.json(updated);
    }

    static async deleteEvenement(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        const evenement = await findOwnedEvenement(req, evenements);
        if (!await evenements.delete(evenement.id)) {
            throw createError(404, "Événement introuvable.");
        }
        res.status(204).end();
    }

    
    static async getOccurrences(req, res) {
        const evenements = new EvenementRepository(
            req.app.locals.database
        );

        const evenement = await findOwnedEvenement(req, evenements);

        const occurrences = RecurrenceService.genererOccurrences(
            evenement,
            100
        );

        res.json({
            evenementId: evenement.id,
            occurrences: occurrences.map(occurrence => ({
                start: occurrence.debut.toISOString(),
                end: occurrence.fin.toISOString()
            }))
        });
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
    const resultats = candidats.filter(evenement =>
        evenementChevauchePeriode(
            evenement, startDate, endDate
        )
    );

    res.json(resultats);
}

}




