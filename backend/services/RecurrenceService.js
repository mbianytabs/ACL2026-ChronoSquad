const DAY_MS = 24 * 60 * 60 * 1000;
const FREQUENCES = ["daily", "weekly", "monthly", "yearly"];

// Garde-fou : une seule requête ne doit jamais produire une liste démesurée.
export const MAX_OCCURRENCES = 5000;

function cle(date) {
    return new Date(date).toISOString();
}

function verifierEvenement(evenement) {
    const debut = evenement.start;
    const fin = evenement.end;

    if (!(debut instanceof Date) || Number.isNaN(debut.getTime())) {
        throw new Error("La date de début de l'événement est invalide.");
    }
    if (!(fin instanceof Date) || Number.isNaN(fin.getTime())) {
        throw new Error("La date de fin de l'événement est invalide.");
    }
    if (fin <= debut) {
        throw new Error("La date de fin doit être postérieure au début.");
    }
    if (evenement.recurrenceFrequency &&
        !FREQUENCES.includes(evenement.recurrenceFrequency)) {
        throw new Error("La fréquence de récurrence est inconnue.");
    }
}

function lireDate(valeur, nom) {
    if (valeur === undefined || valeur === null) return null;
    const date = new Date(valeur);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`La borne ${nom} de la période est invalide.`);
    }
    return date;
}

export class RecurrenceService {
    /**
     * Dernier début d'occurrence autorisé (inclus), ou Infinity si la série
     * n'a pas de date de fin.
     */
    static dernierDebut(evenement) {
        if (!evenement.recurrenceFrequency) return evenement.start.getTime();
        if (!evenement.recurrenceEndDate) return Infinity;
        const limite = Date.parse(`${evenement.recurrenceEndDate}T23:59:59.999Z`);
        if (Number.isNaN(limite)) {
            throw new Error("La date de fin de récurrence est invalide.");
        }
        return limite;
    }

    /**
     * Estime un index légèrement avant la première occurrence pouvant chevaucher
     * `date`, pour ne pas parcourir toute la série depuis le début.
     */
    static indexAvant(evenement, date) {
        const debutInitial = evenement.start;
        const duree = evenement.end.getTime() - debutInitial.getTime();
        const cible = new Date(date.getTime() - duree);
        let index = 0;

        switch (evenement.recurrenceFrequency) {
            case "daily":
                index = Math.floor((cible - debutInitial) / DAY_MS) - 1;
                break;
            case "weekly":
                index = Math.floor((cible - debutInitial) / (7 * DAY_MS)) - 1;
                break;
            case "monthly":
                index = (cible.getUTCFullYear() - debutInitial.getUTCFullYear()) * 12
                    + cible.getUTCMonth() - debutInitial.getUTCMonth() - 1;
                break;
            case "yearly":
                index = cible.getUTCFullYear() - debutInitial.getUTCFullYear() - 1;
                break;
        }
        return Number.isFinite(index) ? Math.max(0, index) : 0;
    }

    /**
     * Parcourt les débuts d'occurrence d'origine (sans exceptions) à partir
     * de la première pouvant chevaucher `depuis`.
     */
    static *debutsDepuis(evenement, depuis = null) {
        if (!evenement.recurrenceFrequency) {
            yield new Date(evenement.start);
            return;
        }
        const dernier = this.dernierDebut(evenement);
        let index = depuis ? this.indexAvant(evenement, depuis) : 0;
        for (;; index++) {
            const debut = this.calculerDebutOccurrence(
                evenement.start,
                evenement.recurrenceFrequency,
                index
            );
            if (!Number.isFinite(debut.getTime()) || debut.getTime() > dernier) {
                return;
            }
            yield debut;
        }
    }

    /** Indique si `date` est le début d'origine d'une occurrence de la série. */
    static estOccurrence(evenement, date) {
        verifierEvenement(evenement);
        const cible = new Date(date);
        if (Number.isNaN(cible.getTime())) return false;
        if (!evenement.recurrenceFrequency) return false;

        // On démarre un peu avant la date pour ne rater aucune occurrence.
        const depuis = new Date(cible.getTime() + evenement.end.getTime() - evenement.start.getTime());
        for (const debut of this.debutsDepuis(evenement, depuis)) {
            if (debut.getTime() === cible.getTime()) return true;
            if (debut > cible) return false;
        }
        return false;
    }

    /**
     * Génère les occurrences d'un événement.
     *
     * - `debut` / `fin` : période consultée (fin exclusive). Seules les
     *   occurrences qui la chevauchent sont renvoyées. Une série sans date
     *   de fin exige une borne de fin.
     * - `exceptions` : occurrences supprimées (`cancelled`) ou modifiées,
     *   identifiées par `occurrenceStart` (début d'origine).
     *
     * Chaque occurrence contient `occurrenceStart` (début d'origine, sert
     * d'identifiant), `debut`, `fin`, les textes et `modifiee`.
     */
    static genererOccurrences(evenement, { debut = null, fin = null, exceptions = [] } = {}) {
        verifierEvenement(evenement);
        const borneDebut = lireDate(debut, "de début");
        const borneFin = lireDate(fin, "de fin");

        if (borneDebut && borneFin && borneFin <= borneDebut) {
            throw new Error("La fin de la période doit être postérieure à son début.");
        }
        if (!borneFin && evenement.recurrenceFrequency && !evenement.recurrenceEndDate) {
            throw new Error("Une récurrence sans date de fin nécessite une période de consultation.");
        }

        const duree = evenement.end.getTime() - evenement.start.getTime();
        const chevauche = (d, f) =>
            (!borneFin || d < borneFin) && (!borneDebut || f > borneDebut);

        const parCle = new Map();
        if (evenement.recurrenceFrequency) {
            for (const exception of exceptions) {
                parCle.set(cle(exception.occurrenceStart), exception);
            }
        }

        const occurrences = [];
        const ajouter = occurrence => {
            if (occurrences.length >= MAX_OCCURRENCES) {
                throw new Error("La période demandée contient trop d'occurrences ; réduisez-la.");
            }
            occurrences.push(occurrence);
        };

        for (const depart of this.debutsDepuis(evenement, borneDebut)) {
            if (borneFin && depart >= borneFin) break;
            if (parCle.has(cle(depart))) continue;
            const arrivee = new Date(depart.getTime() + duree);
            if (!chevauche(depart, arrivee)) continue;
            ajouter({
                occurrenceStart: new Date(depart),
                debut: depart,
                fin: arrivee,
                title: evenement.title,
                description: evenement.description,
                location: evenement.location,
                modifiee: false
            });
        }

        // Les occurrences modifiées peuvent avoir été déplacées dans
        // (ou hors de) la période : on les place selon leurs nouvelles dates.
        const dernier = this.dernierDebut(evenement);
        for (const exception of parCle.values()) {
            if (exception.cancelled) continue;
            const origine = new Date(exception.occurrenceStart);
            if (origine.getTime() > dernier || origine < evenement.start) continue;
            const d = new Date(exception.start);
            const f = new Date(exception.end);
            if (!chevauche(d, f)) continue;
            ajouter({
                occurrenceStart: origine,
                debut: d,
                fin: f,
                title: exception.title,
                description: exception.description ?? "",
                location: exception.location ?? "",
                modifiee: true
            });
        }

        return occurrences.sort((a, b) => a.debut - b.debut || a.occurrenceStart - b.occurrenceStart);
    }

    /**
     * Indique si au moins une occurrence (exceptions comprises) chevauche
     * [debut, fin[. Les bornes peuvent être null (période ouverte).
     */
    static aUneOccurrence(evenement, debut = null, fin = null, exceptions = []) {
        verifierEvenement(evenement);
        const duree = evenement.end.getTime() - evenement.start.getTime();
        const chevauche = (d, f) => (!fin || d < fin) && (!debut || f > debut);

        if (!evenement.recurrenceFrequency) {
            return chevauche(evenement.start, evenement.end);
        }

        const exclues = new Set();
        const dernier = this.dernierDebut(evenement);
        for (const exception of exceptions) {
            exclues.add(cle(exception.occurrenceStart));
            const origine = new Date(exception.occurrenceStart);
            if (!exception.cancelled && origine.getTime() <= dernier && origine >= evenement.start &&
                chevauche(new Date(exception.start), new Date(exception.end))) {
                return true;
            }
        }

        for (const depart of this.debutsDepuis(evenement, debut)) {
            if (fin && depart >= fin) return false;
            if (exclues.has(cle(depart))) continue;
            if (chevauche(depart, new Date(depart.getTime() + duree))) return true;
        }
        return false;
    }

    static calculerDebutOccurrence(debutInitial, frequence, index) {
        const debut = new Date(debutInitial);

        switch (frequence) {
            case "daily":
                debut.setUTCDate(debut.getUTCDate() + index);
                break;

            case "weekly":
                debut.setUTCDate(debut.getUTCDate() + 7 * index);
                break;

            case "monthly": {
                const jourInitial = debutInitial.getUTCDate();
                const moisCible = debutInitial.getUTCMonth() + index;

                debut.setUTCDate(1);
                debut.setUTCMonth(moisCible);

                const dernierJour = new Date(
                    Date.UTC(
                        debut.getUTCFullYear(),
                        debut.getUTCMonth() + 1,
                        0
                    )
                ).getUTCDate();

                debut.setUTCDate(Math.min(jourInitial, dernierJour));
                break;
            }

            case "yearly": {
                const moisInitial = debutInitial.getUTCMonth();
                const jourInitial = debutInitial.getUTCDate();
                const anneeCible = debutInitial.getUTCFullYear() + index;

                debut.setUTCDate(1);
                debut.setUTCFullYear(anneeCible);
                debut.setUTCMonth(moisInitial);

                const dernierJour = new Date(
                    Date.UTC(anneeCible, moisInitial + 1, 0)
                ).getUTCDate();

                debut.setUTCDate(Math.min(jourInitial, dernierJour));
                break;
            }

            default:
                throw new Error("La fréquence de récurrence est inconnue.");
        }

        return debut;
    }
}
