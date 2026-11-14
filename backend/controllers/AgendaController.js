import createError from "http-errors";
import { Agenda } from "../models/Agenda.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { UserRepository } from "../repositories/UserRepository.js";

async function findOwnedAgenda(req, agendas) {
    const agenda = await agendas.findById(req.params.id);
    if (!agenda || agenda.ownerId !== req.user.id) {
        throw createError(404, "Agenda introuvable.");
    }
    return agenda;
}

export class AgendaController {
    static async getAgendas(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        res.json(await agendas.findAccessible(req.user.id));
    }

    static async getAgenda(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(req.params.id);
        if (!agenda || !await agendas.hasAccess(agenda.id, req.user.id)) {
            throw createError(404, "Agenda introuvable.");
        }
        res.json(agenda);
    }

    static async getPartages(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await findOwnedAgenda(req, agendas);
        res.json(await agendas.findPartages(agenda.id));
    }

    static async addPartage(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await findOwnedAgenda(req, agendas);
        if (typeof req.body?.username !== "string" || !req.body.username.trim()) {
            throw createError(400, "Saisissez le nom d'un utilisateur.");
        }
        const users = new UserRepository(req.app.locals.database);
        const user = await users.findByUsername(req.body.username.trim());
        if (!user) {
            throw createError(404, "Utilisateur introuvable.");
        }
        if (user.id === req.user.id) {
            throw createError(400, "Vous êtes déjà le propriétaire de cet agenda.");
        }
        if (!await agendas.addPartage(agenda.id, user.id)) {
            throw createError(409, "Cet utilisateur a déjà accès à cet agenda.");
        }
        res.status(201).json({ id: user.id, username: user.username });
    }

    static async removePartage(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await findOwnedAgenda(req, agendas);
        if (!await agendas.removePartage(agenda.id, req.params.username)) {
            throw createError(404, "Partage introuvable.");
        }
        res.status(204).end();
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
        if (!agenda || !await agendas.hasAccess(agenda.id, req.user.id)) {
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
