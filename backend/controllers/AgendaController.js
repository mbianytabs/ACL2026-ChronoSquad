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
        if (!agenda || agenda.ownerId !== req.user.id) {
            throw createError(404, "Agenda introuvable.");
        }
        res.json(agenda);
    }

    static async createAgenda(req, res) {
        let agenda;
        try {
            agenda = new Agenda(null, req.body?.name, req.user.id, req.body?.color);
        } catch (error) {
            throw createError(400, error.message);
        }
        const agendas = new AgendaRepository(req.app.locals.database);
        res.status(201).json(await agendas.create(agenda));
    }

    static async deleteAgenda(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(req.params.id);
        if (!agenda || agenda.ownerId !== req.user.id) {
            throw createError(404, "Agenda introuvable.");
        }
        if (!await agendas.delete(agenda.id)) {
            throw createError(404, "Agenda introuvable.");
        }
        res.status(204).end();
    }

    static async updateAgenda(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(req.params.id);
        if (!agenda || agenda.ownerId !== req.user.id) {
            throw createError(404, "Agenda introuvable.");
        }
        if (typeof req.body?.name !== "string" || typeof req.body?.color !== "string") {
            throw createError(400, "Le nom et la couleur sont requis.");
        }
        try {
            agenda.rename(req.body.name);
            agenda.changeColor(req.body.color);
        } catch (error) {
            throw createError(400, error.message);
        }
        const updated = await agendas.update(agenda);
        if (!updated) {
            throw createError(404, "Agenda introuvable.");
        }
        res.json(updated);
    }
}
