
import assert from "node:assert/strict";
import { RecurrenceService } from "../services/RecurrenceService.js";

function tester(nom, action) {
    try {
        action();
        console.log(`RÉUSSI : ${nom}`);
    } catch (error) {
        console.error(`ÉCHEC : ${nom}`);
        console.error(error.message);
        process.exitCode = 1;
    }
}

function creerEvenement({
    start = "2026-01-01T10:00:00.000Z",
    end = "2026-01-01T11:00:00.000Z",
    recurrenceFrequency = null,
    recurrenceEndDate = null
} = {}) {
    return {
        start: new Date(start),
        end: new Date(end),
        recurrenceFrequency,
        recurrenceEndDate
    };
}

function datesDesDebuts(occurrences) {
    return occurrences.map(o => o.debut.toISOString());
}

// 1. Événement sans récurrence : une seule occurrence.
tester("Événement sans récurrence", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement()
    );

    assert.equal(resultat.length, 1);
    assert.equal(
        resultat[0].debut.toISOString(),
        "2026-01-01T10:00:00.000Z"
    );
    assert.equal(
        resultat[0].fin.toISOString(),
        "2026-01-01T11:00:00.000Z"
    );
});

// 2. Récurrence quotidienne.
tester("Récurrence quotidienne", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            recurrenceFrequency: "daily",
            recurrenceEndDate: "2026-01-03"
        })
    );

    assert.deepEqual(
        datesDesDebuts(resultat),
        [
            "2026-01-01T10:00:00.000Z",
            "2026-01-02T10:00:00.000Z",
            "2026-01-03T10:00:00.000Z"
        ]
    );
});

// 3. Récurrence hebdomadaire.
tester("Récurrence hebdomadaire", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            recurrenceFrequency: "weekly",
            recurrenceEndDate: "2026-01-15"
        })
    );

    assert.deepEqual(
        datesDesDebuts(resultat),
        [
            "2026-01-01T10:00:00.000Z",
            "2026-01-08T10:00:00.000Z",
            "2026-01-15T10:00:00.000Z"
        ]
    );
});

// 4. Récurrence mensuelle à partir du 31 janvier.
tester("Récurrence mensuelle et fin de mois", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            start: "2026-01-31T10:00:00.000Z",
            end: "2026-01-31T11:00:00.000Z",
            recurrenceFrequency: "monthly",
            recurrenceEndDate: "2026-04-30"
        })
    );

    assert.deepEqual(
        datesDesDebuts(resultat),
        [
            "2026-01-31T10:00:00.000Z",
            "2026-02-28T10:00:00.000Z",
            "2026-03-31T10:00:00.000Z",
            "2026-04-30T10:00:00.000Z"
        ]
    );
});

// 5. Récurrence annuelle à partir du 29 février 2024.
tester("Récurrence annuelle et année bissextile", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            start: "2024-02-29T10:00:00.000Z",
            end: "2024-02-29T11:00:00.000Z",
            recurrenceFrequency: "yearly",
            recurrenceEndDate: "2028-02-29"
        })
    );

    assert.deepEqual(
        datesDesDebuts(resultat),
        [
            "2024-02-29T10:00:00.000Z",
            "2025-02-28T10:00:00.000Z",
            "2026-02-28T10:00:00.000Z",
            "2027-02-28T10:00:00.000Z",
            "2028-02-29T10:00:00.000Z"
        ]
    );
});

// 6. Sans date de fin de récurrence : une seule occurrence.
tester("Récurrence sans date de fin", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            recurrenceFrequency: "yearly"
        })
    );

    assert.equal(resultat.length, 1);
});

// 7. Respect de la limite maximale.
tester("Limite maximale d'occurrences", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            recurrenceFrequency: "daily",
            recurrenceEndDate: "2026-12-31"
        }),
        3
    );

    assert.equal(resultat.length, 3);
});

// 8. Durée conservée pour chaque occurrence.
tester("Durée de chaque occurrence conservée", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            start: "2026-01-01T10:00:00.000Z",
            end: "2026-01-01T12:30:00.000Z",
            recurrenceFrequency: "daily",
            recurrenceEndDate: "2026-01-02"
        })
    );

    for (const occurrence of resultat) {
        assert.equal(
            occurrence.fin.getTime() - occurrence.debut.getTime(),
            2.5 * 60 * 60 * 1000
        );
    }
});

// 9. Refuser une date de début invalide.
tester("Refus d'une date de début invalide", () => {
    assert.throws(
        () => RecurrenceService.genererOccurrences(
            creerEvenement({ start: "date-invalide" })
        ),
        /date de début.*invalide/i
    );
});

// 10. Refuser une fréquence inconnue.
tester("Refus d'une fréquence inconnue", () => {
    assert.throws(
        () => RecurrenceService.genererOccurrences(
            creerEvenement({
                recurrenceFrequency: "hourly",
                recurrenceEndDate: "2026-01-03"
            })
        ),
        /fréquence.*inconnue/i
    );
});
