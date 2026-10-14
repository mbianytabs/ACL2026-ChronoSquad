import createError from "http-errors";
import { Evenement } from "../models/Evenement.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";

function readEvenement(body, id, agendaId) {
    if (typeof body?.title !== "string" || typeof body?.start !== "string" || typeof body?.end !== "string" ||
        (body.location !== undefined && typeof body.location !== "string") ||
        (body.description !== undefined && typeof body.description !== "string")) {
        throw createError(400, "Titre et dates requis ; lieu et description doivent être du texte.");
    }
    try {
        return new Evenement(id, agendaId, body.title, body.start, body.end, body.description, body.location);
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
}
