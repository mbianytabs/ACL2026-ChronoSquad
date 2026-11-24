import createError from "http-errors";
import { Agenda } from "../models/Agenda.js";
import { Evenement } from "../models/Evenement.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";
import { ICalendarService } from "../services/ICalendarService.js";
import { zipSync, strToU8 } from "fflate";

/**
 * Lit `selection` : indices (dans `evenements` de l'aperçu) des événements
 * à importer. Absent = tous les événements.
 */
function lireSelection(selection, total) {
    if (selection === undefined || selection === null) {
        return [...Array(total).keys()];
    }
    if (!Array.isArray(selection) || selection.length === 0) {
        throw new Error("Sélectionnez au moins un événement à importer.");
    }
    if (selection.some(i => !Number.isInteger(i) || i < 0 || i >= total) ||
        new Set(selection).size !== selection.length) {
        throw new Error("La sélection d'événements est invalide.");
    }
    return [...selection].sort((a, b) => a - b);
}

/** Lit le fichier puis ne garde que les événements sélectionnés. */
async function lireImport(body, agendaId) {
    const data = await ICalendarService.lire(body?.contenu);
    const choisis = lireSelection(body?.selection, data.evenements.length)
        .map(i => data.evenements[i]);
    return {
        data,
        choisis,
        evenements: choisis.map(event => new Evenement(null, agendaId, event.title,
            event.start, event.end, event.description, event.location,
            event.recurrenceFrequency, event.recurrenceEndDate, event.allDay))
    };
}

/** Insère les événements importés (et leurs exceptions) — dans une transaction. */
function insererImport(events, evenements, choisis, agendaId) {
    return evenements.map((event, index) => {
        const inserted = events.insert(event, agendaId);
        for (const exception of choisis[index].exceptions ?? []) {
            events.saveException(inserted.id, exception);
        }
        return inserted;
    });
}

export class ICalendarController {
    static async exporterTous(req, res) {
        const agendas = new AgendaRepository(req.app.locals.database);
        const events = new EvenementRepository(req.app.locals.database);
        const accessibles = await agendas.findAccessible(req.user.id);
        if (accessibles.length === 0) {
            throw createError(400, "Aucun agenda à exporter.");
        }
        const fichiers = {};
        for (const agenda of accessibles) {
            const evenements = await events.findByAgenda(agenda.id);
            const nom = agenda.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "agenda";
            try {
                fichiers[nom + "-" + agenda.id + ".ics"] = strToU8(ICalendarService.exporter(
                    agenda, evenements, events.findExceptionsByEvenement(evenements.map(e => e.id))));
            } catch (error) {
                throw createError(400, error.message);
            }
        }
        res.attachment("chronosquad-agendas.zip");
        res.type("application/zip");
        res.send(Buffer.from(zipSync(fichiers)));
    }

    static async preview(req, res) {
        try {
            const data = await ICalendarService.lire(req.body?.contenu);
            res.json(data);
        } catch (error) {
            throw createError(400, error.message);
        }
    }

    static async importer(req, res) {
        let agenda;
        let lu;
        try {
            lu = await lireImport(req.body, "import");
            agenda = new Agenda(null, req.body?.name ?? lu.data.name, req.user.id, req.body?.color ?? lu.data.color);
        } catch (error) {
            throw createError(400, error.message);
        }
        const db = req.app.locals.database;
        const agendas = new AgendaRepository(db);
        const events = new EvenementRepository(db);
        const result = db.transaction(() => {
            const created = agendas.insert(agenda);
            const imported = insererImport(events, lu.evenements, lu.choisis, created.id);
            return { agenda: created, evenements: imported };
        });
        res.status(201).json(result);
    }

    /** POST /agendas/:id/import : importe un .ics dans un agenda existant. */
    static async importerDansAgenda(req, res) {
        const db = req.app.locals.database;
        const agendas = new AgendaRepository(db);
        const agenda = await agendas.findById(req.params.id);
        if (!agenda || !await agendas.hasAccess(agenda.id, req.user.id)) {
            throw createError(404, "Agenda introuvable.");
        }
        let lu;
        try {
            lu = await lireImport(req.body, agenda.id);
        } catch (error) {
            throw createError(400, error.message);
        }
        const events = new EvenementRepository(db);
        const imported = db.transaction(() =>
            insererImport(events, lu.evenements, lu.choisis, agenda.id));
        res.status(201).json({ agenda, evenements: imported });
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
            contenu = ICalendarService.exporter(
                agenda, evenements, events.findExceptionsByEvenement(evenements.map(e => e.id)));
        } catch (error) {
            throw createError(400, error.message);
        }
        res.attachment("agenda-" + agenda.id + ".ics");
        res.type("text/calendar; charset=utf-8");
        res.send(contenu);
    }
}
