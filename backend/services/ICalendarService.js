import ical from "ical-generator";
import parser from "node-ical";
import { RecurrenceService } from "./RecurrenceService.js";

function formatIcsDate(date, allDay) {
    const iso = new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    return allDay ? iso.slice(0, 8) : iso;
}

// node-ical renvoie les journées entières à minuit heure locale.
function jourUTC(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function recurrenceRule(evenement) {
    const frequency = evenement.recurrenceFrequency;
    if (!frequency) return null;
    if (!["daily", "weekly", "monthly", "yearly"].includes(frequency)) {
        throw new Error("Cette fréquence de récurrence n'est pas prise en charge.");
    }
    const start = new Date(evenement.start);
    let rule = "FREQ=" + frequency.toUpperCase();
    if (frequency === "monthly" && start.getUTCDate() > 28) {
        const days = [];
        for (let day = 28; day <= start.getUTCDate(); day++) days.push(day);
        rule += ";BYMONTHDAY=" + days.join(",") + ";BYSETPOS=-1";
    }
    if (frequency === "yearly" && start.getUTCMonth() === 1 && start.getUTCDate() === 29) {
        rule += ";BYMONTH=2;BYMONTHDAY=28,29;BYSETPOS=-1";
    }
    if (evenement.recurrenceEndDate) {
        rule += ";UNTIL=" + evenement.recurrenceEndDate.replaceAll("-", "");
        if (!evenement.allDay) rule += "T235959Z";
    }
    return rule;
}

function readRecurrence(element) {
    if (element.rdate || element.recurrenceid) {
        throw new Error("Les dates de récurrence ajoutées (RDATE) ou les occurrences isolées ne sont pas prises en charge.");
    }
    if (!element.rrule) {
        if (element.recurrences || element.exdate) {
            throw new Error("Des exceptions de récurrence sont présentes sans règle de récurrence.");
        }
        return { frequency: null, endDate: null };
    }

    const options = element.rrule.origOptions;
    if (element.datetype !== "date" && options.tzid && !["UTC", "Etc/UTC", "GMT"].includes(options.tzid)) {
        throw new Error("Les récurrences avec un fuseau local ne sont pas prises en charge ; utilisez des horaires UTC.");
    }
    const line = element.rrule.toString().split(/\r?\n/).find(line => line.startsWith("RRULE:"));
    const parts = Object.fromEntries(line.slice(6).split(";").map(part => part.split("=")));
    const frequency = parts.FREQ?.toLowerCase();
    const rule = recurrenceRule({ start: element.start, recurrenceFrequency: frequency });
    if (!rule) throw new Error("La fréquence de récurrence est manquante.");
    const expected = Object.fromEntries(rule.split(";").map(part => part.split("=")));
    for (const [key, value] of Object.entries(parts)) {
        if (key === "UNTIL" || (key === "INTERVAL" && value === "1")) continue;
        if (expected[key] !== value) {
            throw new Error("Cette règle de récurrence est trop complexe pour l'application.");
        }
    }
    for (const [key, value] of Object.entries(expected)) {
        if (parts[key] !== value) {
            throw new Error("Cette récurrence de fin de mois n'est pas compatible avec l'application.");
        }
    }
    let endDate = null;
    if (options.until) {
        const until = new Date(options.until);
        if (element.datetype !== "date" && until.toISOString().slice(11, 19) < element.start.toISOString().slice(11, 19)) {
            until.setUTCDate(until.getUTCDate() - 1);
        }
        endDate = until.toISOString().slice(0, 10);
        if (endDate < element.start.toISOString().slice(0, 10)) {
            throw new Error("La récurrence se termine avant le premier événement.");
        }
    }
    return { frequency, endDate };
}

/**
 * Lit les occurrences supprimées (EXDATE) et modifiées (RECURRENCE-ID)
 * d'une série importée. node-ical indexe chaque date deux fois.
 */
function readExceptions(element, allDay, serie) {
    if (!serie.recurrenceFrequency) return [];
    const versCle = date => (allDay && date.dateOnly ? jourUTC(date) : new Date(date)).toISOString();
    const verifier = cle => {
        if (!RecurrenceService.estOccurrence(serie, cle)) {
            throw new Error("Une exception de récurrence ne correspond à aucune occurrence de la série.");
        }
        return cle;
    };
    const exceptions = new Map();

    for (const date of new Set(Object.values(element.exdate ?? {}))) {
        const cle = verifier(versCle(date));
        exceptions.set(cle, { occurrenceStart: cle, cancelled: true });
    }
    for (const occurrence of new Set(Object.values(element.recurrences ?? {}))) {
        if (!(occurrence.recurrenceid instanceof Date) || occurrence.rrule) {
            throw new Error("Une occurrence modifiée est invalide.");
        }
        const cle = verifier(versCle(occurrence.recurrenceid));
        const occAllDay = occurrence.datetype === "date";
        if (occAllDay !== allDay) {
            throw new Error("Une occurrence modifiée doit garder le type « journée entière » de sa série.");
        }
        const start = occAllDay ? jourUTC(occurrence.start) : occurrence.start;
        const end = occAllDay ? jourUTC(occurrence.end) : occurrence.end;
        const title = typeof occurrence.summary === "string" ? occurrence.summary.trim() : "";
        if (!title || !(start instanceof Date) || !(end instanceof Date) ||
            Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            throw new Error("Une occurrence modifiée doit avoir un titre et des dates valides.");
        }
        exceptions.set(cle, {
            occurrenceStart: cle,
            cancelled: false,
            title,
            start: start.toISOString(),
            end: end.toISOString(),
            description: typeof occurrence.description === "string" ? occurrence.description : "",
            location: typeof occurrence.location === "string" ? occurrence.location : ""
        });
    }
    return [...exceptions.values()];
}

export class ICalendarService {
    /**
     * `exceptions` : Map evenementId -> occurrences supprimées (EXDATE) ou
     * modifiées (VEVENT avec RECURRENCE-ID et le même UID).
     */
    static exporter(agenda, evenements, exceptions = new Map()) {
        const calendrier = ical({ name: agenda.name, color: agenda.color });

        for (const evenement of evenements) {
            if (evenement.agendaId !== agenda.id) {
                throw new Error("Un événement n'appartient pas à l'agenda exporté.");
            }
            const allDay = evenement.allDay ?? false;
            let repeating = recurrenceRule(evenement);
            const liste = repeating ? (exceptions.get(evenement.id) ?? []) : [];
            const supprimees = liste.filter(e => e.cancelled).map(e => formatIcsDate(e.occurrenceStart, allDay));
            if (supprimees.length > 0) {
                repeating = "RRULE:" + repeating + "\r\nEXDATE" + (allDay ? ";VALUE=DATE:" : ":") + supprimees.join(",");
            }
            const modifiees = liste.filter(e => !e.cancelled);
            const uid = modifiees.length > 0 ? `evenement-${evenement.id}@chronosquad` : undefined;
            calendrier.createEvent({
                ...(uid ? { id: uid } : {}),
                start: new Date(evenement.start),
                end: new Date(evenement.end),
                summary: evenement.title,
                description: evenement.description,
                location: evenement.location,
                allDay,
                repeating
            });
            for (const modifiee of modifiees) {
                calendrier.createEvent({
                    id: uid,
                    start: new Date(modifiee.start),
                    end: new Date(modifiee.end),
                    summary: modifiee.title,
                    description: modifiee.description,
                    location: modifiee.location,
                    allDay,
                    recurrenceId: new Date(modifiee.occurrenceStart)
                });
            }
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
        const texte = contenu.trim().replace(/\r?\n[ \t]/g, "");
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

        for (const ligne of texte.matchAll(/^(?:EXDATE|RECURRENCE-ID)(;[^:\r\n]*)?:([^\r\n]*)$/gm)) {
            if (/\d{8}T\d{6}(?!Z)(,|\r?$)/.test(ligne[2]) && !ligne[1]?.includes("TZID=")) {
                throw new Error("Les exceptions de récurrence doivent préciser UTC (Z) ou un fuseau horaire (TZID).");
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
            const allDay = element.datetype === "date";
            if (allDay) {
                if (!(element.start instanceof Date) || !(element.end instanceof Date) ||
                    !element.start.dateOnly || !element.end.dateOnly) {
                    throw new Error("Une journée entière doit avoir des dates de début et de fin sans heures.");
                }
                element.start = new Date(Date.UTC(element.start.getFullYear(), element.start.getMonth(), element.start.getDate()));
                element.end = new Date(Date.UTC(element.end.getFullYear(), element.end.getMonth(), element.end.getDate()));
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
            const recurrence = readRecurrence(element);
            const exceptions = readExceptions(element, allDay, {
                start: element.start,
                end: element.end,
                recurrenceFrequency: recurrence.frequency,
                recurrenceEndDate: recurrence.endDate
            });

            evenements.push({
                title: element.summary.trim(),
                start: element.start.toISOString(),
                end: element.end.toISOString(),
                description,
                location,
                recurrenceFrequency: recurrence.frequency,
                recurrenceEndDate: recurrence.endDate,
                allDay,
                ...(exceptions.length > 0 ? { exceptions } : {})
            });
        }
        // Les occurrences modifiées (RECURRENCE-ID) sont des VEVENT rattachés à leur série.
        const modifiees = evenements.reduce((n, e) => n + (e.exceptions ?? []).filter(x => !x.cancelled).length, 0);
        if (evenements.length + modifiees !== nombreEvenements) {
            throw new Error("Le fichier contient des événements incomplets ou des identifiants en doublon.");
        }

        return { name: name.trim(), color, evenements };
    }
}
