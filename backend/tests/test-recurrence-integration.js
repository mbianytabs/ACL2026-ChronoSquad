
import assert from "node:assert/strict";
import { getDatabase, closeDatabase } from "../storage/SQLiteDatabase.js";
import { Evenement } from "../models/Evenement.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";
import { RecurrenceService } from "../services/RecurrenceService.js";

async function tester() {
    try {
        const db = getDatabase();
        const repository = new EvenementRepository(db);

        // Utiliser un agenda existant pour respecter la clé étrangère.
        const agenda = db.get(
            "SELECT id FROM agenda LIMIT 1"
        );

        if (!agenda) {
            throw new Error(
                "Aucun agenda en base. Crée d'abord un agenda de test."
            );
        }

        const evenement = new Evenement(
            null,
            agenda.id,
            "Test récurrence annuelle",
            "2026-11-10T10:00:00.000Z",
            "2026-11-10T11:00:00.000Z",
            "Événement créé par le script de test",
            "Nancy",
            "yearly",
            "2028-11-10"
        );

        // Enregistrer dans SQLite.
        const cree = await repository.create(evenement);
        console.log("Événement enregistré :", cree.toJSON());

        // Relire depuis SQLite.
        const relu = await repository.findById(cree.id);

        assert.equal(relu.recurrenceFrequency, "yearly");
        assert.equal(relu.recurrenceEndDate, "2028-11-10");

        console.log("RÉUSSI : les informations de récurrence sont persistées.");

        // Calculer les occurrences.
        const occurrences =
            RecurrenceService.genererOccurrences(relu, 100);

        assert.equal(occurrences.length, 3);

        console.log(
            "Occurrences calculées :",
            occurrences.map(o => ({
                start: o.debut.toISOString(),
                end: o.fin.toISOString()
            }))
        );

        console.log("RÉUSSI : les 3 occurrences annuelles sont calculées.");

        // Nettoyer l'événement de test.
        await repository.delete(cree.id);
        console.log("Événement de test supprimé.");
    } finally {
        closeDatabase();
    }
}

tester().catch(error => {
    console.error("ÉCHEC DU TEST :", error);
    process.exitCode = 1;
});
