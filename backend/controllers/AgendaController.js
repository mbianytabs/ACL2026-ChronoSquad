import createError from "http-errors";
import { Agenda } from "../models/Agenda.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";

export class AgendaController {
    static async getAgendas(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        res.json(await agendas.findByOwner(req.user.id));
    }

    static async getAgenda(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(req.params.id);
        if (!agenda || agenda.ownerId !== req.user.id) throw createError(404, "Agenda introuvable.");
        res.json(agenda);
    }

    static async createAgenda(req, res) {
        let agenda;
        try {
            // L'identifiant sera choisi par SQLite ; le propriétaire vient de la session.
            agenda = new Agenda(null, req.body?.name, req.user.id, req.body?.color);
        } catch (error) {
            throw createError(400, error.message);
        }
        const agendas = new AgendaRepository(req.app.locals.database);
        res.status(201).json(await agendas.create(agenda));
    }
}
