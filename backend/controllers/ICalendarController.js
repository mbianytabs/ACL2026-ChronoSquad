import createError from "http-errors";
import { Agenda } from "../models/Agenda.js";
import { Evenement } from "../models/Evenement.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";
import { ICalendarService } from "../services/ICalendarService.js";

export class ICalendarController {
    static async preview(req, res) {
        try {
            const data = await ICalendarService.lire(req.body?.contenu);
            res.json(data);
        } catch (error) {
            throw createError(400, error.message);
        }
    }

    static async importer(req, res) {
        let data;
        let agenda;
        let evenements;
        try {
            data = await ICalendarService.lire(req.body?.contenu);
            agenda = new Agenda(null, req.body?.name ?? data.name, req.user.id, req.body?.color ?? data.color);
            evenements = data.evenements.map(event => new Evenement(null, "import", event.title,
                event.start, event.end, event.description, event.location, event.recurrenceFrequency, event.recurrenceEndDate));
        } catch (error) {
            throw createError(400, error.message);
        }
        const db = req.app.locals.database;
        const agendas = new AgendaRepository(db);
        const events = new EvenementRepository(db);
        const result = db.transaction(() => {
            const created = agendas.insert(agenda);
            const imported = evenements.map(event => events.insert(event, created.id));
            return { agenda: created, evenements: imported };
        });
        res.status(201).json(result);
    }

    static async exporter(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const agenda = await agendas.findById(req.params.id);
        if (!agenda || !await agendas.hasAccess(agenda.id, req.user.id)) {
            throw createError(404, "Agenda introuvable.");
        }
        const events = new EvenementRepository(req.app.locals.database);
        const evenements = await events.findByAgenda(agenda.id);
        let contenu;
        try {
            contenu = ICalendarService.exporter(agenda, evenements);
        } catch (error) {
            throw createError(400, error.message);
        }
        res.attachment("agenda-" + agenda.id + ".ics");
        res.type("text/calendar; charset=utf-8");
        res.send(contenu);
    }
}
