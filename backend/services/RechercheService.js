import { RecurrenceService } from "./RecurrenceService.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Trouve une occurrence qui chevauche une période définie par des jours UTC.
 * La borne de début est inclusive, celle de fin est le lendemain à 00:00 (exclusive)
 * Une récurrence sans date de fin ne génère que son occurrence initiale,
 * On saute directement près de la période recherchée plutôt que de générer
 * les 100 premières occurrences (qui pourraient être trop anciennes).
 */
export function evenementChevauchePeriode(evenement, startDate, endDate) {
    if (!startDate && !endDate) return true;

    const borneDebut = startDate
        ? Date.parse(`${startDate}T00:00:00.000Z`)
        : -Infinity;
    const borneFin = endDate
        ? Date.parse(`${endDate}T00:00:00.000Z`) + DAY_MS
        : Infinity;

    const debutInitial = evenement.start;
    const debutMs = debutInitial.getTime();
    const dureeMs = evenement.end.getTime() - debutMs;

    if (!evenement.recurrenceFrequency || !evenement.recurrenceEndDate) {
        return debutMs < borneFin && debutMs + dureeMs > borneDebut;
    }

    const derniereDateDebut = Date.parse(
        `${evenement.recurrenceEndDate}T23:59:59.999Z`
    );

    let index = 0;
    if (startDate) {
        //Une occurrence peut commencer avant la période et se terminer dedans.
        const cible = new Date(borneDebut - dureeMs);
        switch (evenement.recurrenceFrequency) {
            case "daily":
                index = Math.floor((cible.getTime() - debutMs) / DAY_MS) - 1;
                break;
            case "weekly":
                index = Math.floor((cible.getTime() - debutMs) / (7 * DAY_MS)) - 1;
                break;
            case "monthly":
                index = (cible.getUTCFullYear() - debutInitial.getUTCFullYear()) * 12
                    + cible.getUTCMonth() - debutInitial.getUTCMonth() - 1;
                break;
            case "yearly":
                index = cible.getUTCFullYear() - debutInitial.getUTCFullYear() - 1;
                break;
        }
        index = Math.max(0, index);
    }

    //L'index est estimé juste avant la période
    // On s'arrête dès que la date de fin de récurrence ou de recherche est dépassée
    for (;; index++) {
        const debutOccurrence = RecurrenceService.calculerDebutOccurrence(
            debutInitial,
            evenement.recurrenceFrequency,
            index
        ).getTime();

        if (!Number.isFinite(debutOccurrence) ||
            debutOccurrence > derniereDateDebut ||
            debutOccurrence >= borneFin) {
            return false;
        }

        if (debutOccurrence + dureeMs > borneDebut) {
            return true;
        }
    }
}
