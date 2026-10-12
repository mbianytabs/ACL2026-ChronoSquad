import createError from "http-errors";
import { Evenement } from "../models/Evenement.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";

export class EvenementController {
    static async getEvenements(req, res) {
        const evenements = new EvenementRepository(req.app.locals.database);
        res.json(await evenements.findByOwner(req.user.id));
    }

    static async createEvenement(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(req.params.agendaId);
        if (!agenda || agenda.ownerId !== req.user.id) throw createError(404, "Agenda introuvable.");

        const body = req.body;
        if (typeof body?.title !== "string" || typeof body?.start !== "string" || typeof body?.end !== "string" ||
            (body.location !== undefined && typeof body.location !== "string") ||
            (body.description !== undefined && typeof body.description !== "string")) {
            throw createError(400, "Titre et dates requis ; lieu et description doivent être du texte.");
        }
        let evenement;
        try {
            evenement = new Evenement(null, agenda.id, body.title, body.start, body.end, body.description, body.location);
        } catch (error) {
            throw createError(400, error.message);
        }
        const evenements = new EvenementRepository(req.app.locals.database);
        res.status(201).json(await evenements.create(evenement));
    }
}
