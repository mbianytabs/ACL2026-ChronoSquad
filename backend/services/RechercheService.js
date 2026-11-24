import { RecurrenceService } from "./RecurrenceService.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Trouve une occurrence qui chevauche une période définie par des jours UTC.
 * La borne de début est inclusive, celle de fin est le lendemain à 00:00 (exclusive).
 * Une récurrence sans date de fin se répète indéfiniment ; les occurrences
 * supprimées ou modifiées (`exceptions`) sont prises en compte.
 */
export function evenementChevauchePeriode(evenement, startDate, endDate, exceptions = []) {
    if (!startDate && !endDate) return true;

    const borneDebut = startDate
        ? new Date(`${startDate}T00:00:00.000Z`)
        : null;
    const borneFin = endDate
        ? new Date(Date.parse(`${endDate}T00:00:00.000Z`) + DAY_MS)
        : null;

    return RecurrenceService.aUneOccurrence(evenement, borneDebut, borneFin, exceptions);
}
