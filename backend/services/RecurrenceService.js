
export class RecurrenceService {
    static genererOccurrences(evenement, limiteMax = 100) {
        const debutInitial = evenement.start;
        const finInitial = evenement.end;
        const frequence = evenement.recurrenceFrequency;
        const dateFin = evenement.recurrenceEndDate;

        if (
            !(debutInitial instanceof Date) ||
            Number.isNaN(debutInitial.getTime())
        ) {
            throw new Error("La date de début de l'événement est invalide.");
        }

        if (
            !(finInitial instanceof Date) ||
            Number.isNaN(finInitial.getTime())
        ) {
            throw new Error("La date de fin de l'événement est invalide.");
        }

        if (finInitial <= debutInitial) {
            throw new Error("La date de fin doit être postérieure au début.");
        }

        if (!Number.isInteger(limiteMax) || limiteMax < 1) {
            throw new Error("La limite maximale doit être un entier positif.");
        }

        const duree = finInitial.getTime() - debutInitial.getTime();

        // Sans récurrence, l'événement ne possède qu'une occurrence.
        if (!frequence) {
            return [{
                debut: new Date(debutInitial),
                fin: new Date(finInitial)
            }];
        }

        const frequencesAutorisees = [
            "daily",
            "weekly",
            "monthly",
            "yearly"
        ];

        if (!frequencesAutorisees.includes(frequence)) {
            throw new Error("La fréquence de récurrence est inconnue.");
        }

        let dateLimite;

        if (dateFin) {
            // La date de fin de récurrence est incluse dans la journée.
            dateLimite = new Date(`${dateFin}T23:59:59.999Z`);

            if (Number.isNaN(dateLimite.getTime())) {
                throw new Error("La date de fin de récurrence est invalide.");
            }
        } else {
            // Sans date de fin, seule l'occurrence initiale est générée.
            dateLimite = new Date(debutInitial);
        }

        if (dateLimite < debutInitial) {
            return [];
        }

        const occurrences = [];

        // On calcule chaque occurrence à partir de la date initiale.
        // Cela évite les décalages pour les fins de mois et les années bissextiles.
        for (
            let index = 0;
            index < limiteMax;
            index++
        ) {
            const debut = this.calculerDebutOccurrence(
                debutInitial,
                frequence,
                index
            );

            if (debut > dateLimite) {
                break;
            }

            occurrences.push({
                debut,
                fin: new Date(debut.getTime() + duree)
            });
        }

        return occurrences;
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
