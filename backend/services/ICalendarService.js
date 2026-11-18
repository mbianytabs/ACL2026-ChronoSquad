import ical from "ical-generator";
import parser from "node-ical";

export class ICalendarService {
    static exporter(agenda, evenements) {
        const calendrier = ical({ name: agenda.name, color: agenda.color });

        for (const evenement of evenements) {
            if (evenement.agendaId !== agenda.id) {
                throw new Error("Un événement n'appartient pas à l'agenda exporté.");
            }
            if (evenement.recurrenceFrequency) {
                throw new Error("L'export des événements récurrents n'est pas encore disponible.");
            }
            calendrier.createEvent({
                start: new Date(evenement.start),
                end: new Date(evenement.end),
                summary: evenement.title,
                description: evenement.description,
                location: evenement.location
            });
        }

        return calendrier.toString();
    }

    static async lire(contenu) {
        if (typeof contenu !== "string" || !contenu.trim()) {
            throw new Error("Le fichier iCalendar est vide.");
        }
        if (Buffer.byteLength(contenu, "utf8") > 1024 * 1024) {
            throw new Error("Le fichier ne doit pas dépasser 1 Mo.");
        }
        const texte = contenu.trim();
        const calendriers = texte.match(/^BEGIN:VCALENDAR\r?$/gm) || [];
        if (calendriers.length !== 1 || !texte.startsWith("BEGIN:VCALENDAR") || !texte.endsWith("END:VCALENDAR")) {
            throw new Error("Le fichier doit contenir un seul calendrier au format .ics.");
        }
        const nombreEvenements = (texte.match(/^BEGIN:VEVENT\r?$/gm) || []).length;
        if (nombreEvenements > 2000) {
            throw new Error("Un import ne doit pas dépasser 2000 événements.");
        }
        for (const date of texte.matchAll(/^DT(?:START|END)(;[^:\r\n]*)?:(\d{8}T\d{6})(Z)?\r?$/gm)) {
            if (!date[3] && !date[1]?.includes("TZID=")) {
                throw new Error("Les horaires doivent préciser UTC (Z) ou un fuseau horaire (TZID).");
            }
        }

        let donnees;
        try {
            donnees = await parser.async.parseICS(texte);
        } catch {
            throw new Error("Le fichier iCalendar est invalide.");
        }
        if (donnees.vcalendar?.version !== "2.0") {
            throw new Error("Le fichier doit utiliser iCalendar version 2.0.");
        }

        const name = donnees.vcalendar.name || donnees.vcalendar["WR-CALNAME"] || "Agenda importé";
        const color = donnees.vcalendar["APPLE-CALENDAR-COLOR"] || "#3b82f6";
        if (typeof name !== "string" || !name.trim() || typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
            throw new Error("Le nom ou la couleur de l'agenda est invalide.");
        }

        const evenements = [];
        for (const element of Object.values(donnees)) {
            if (element.type === "VCALENDAR" || element.type === "VTIMEZONE") {
                continue;
            }
            if (element.type !== "VEVENT") {
                throw new Error("Seuls les événements de calendrier sont pris en charge.");
            }
            if (element.rrule || element.recurrences || element.exdate || element.rdate || element.recurrenceid) {
                throw new Error("L'import des événements récurrents n'est pas encore disponible.");
            }
            if (element.datetype === "date") {
                throw new Error("Les événements sur une journée entière ne sont pas encore pris en charge.");
            }
            if (typeof element.summary !== "string" || !element.summary.trim()) {
                throw new Error("Chaque événement doit avoir un titre.");
            }
            if (!(element.start instanceof Date) || !(element.end instanceof Date) ||
                Number.isNaN(element.start.getTime()) || Number.isNaN(element.end.getTime()) || element.end <= element.start) {
                throw new Error("Chaque événement doit avoir des dates valides, avec une fin après le début.");
            }
            const description = element.description ?? "";
            const location = element.location ?? "";
            if (typeof description !== "string" || typeof location !== "string") {
                throw new Error("Le lieu et la description doivent être du texte.");
            }

            evenements.push({
                title: element.summary.trim(),
                start: element.start.toISOString(),
                end: element.end.toISOString(),
                description,
                location,
                recurrenceFrequency: null,
                recurrenceEndDate: null
            });
        }
        if (evenements.length !== nombreEvenements) {
            throw new Error("Le fichier contient des événements incomplets ou des identifiants en doublon.");
        }

        return { name: name.trim(), color, evenements };
    }
}
