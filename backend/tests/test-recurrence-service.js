
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

// 6. Sans date de fin : la série continue, bornée par la période consultée.
tester("Récurrence sans date de fin, générée selon la période", () => {
    const evenement = creerEvenement({ recurrenceFrequency: "yearly" });

    assert.throws(
        () => RecurrenceService.genererOccurrences(evenement),
        /période/i
    );

    const resultat = RecurrenceService.genererOccurrences(evenement, {
        debut: "2030-01-01T00:00:00.000Z",
        fin: "2032-01-01T00:00:00.000Z"
    });

    assert.deepEqual(
        datesDesDebuts(resultat),
        ["2030-01-01T10:00:00.000Z", "2031-01-01T10:00:00.000Z"]
    );
});

// 7. Seules les occurrences de la période sont générées (plus de limite à 100).
tester("Occurrences limitées à la période consultée", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            recurrenceFrequency: "daily",
            recurrenceEndDate: "2030-12-31"
        }),
        {
            debut: "2029-06-10T00:00:00.000Z",
            fin: "2029-06-13T00:00:00.000Z"
        }
    );

    assert.deepEqual(
        datesDesDebuts(resultat),
        [
            "2029-06-10T10:00:00.000Z",
            "2029-06-11T10:00:00.000Z",
            "2029-06-12T10:00:00.000Z"
        ]
    );

    // La série complète dépasse largement les anciennes 100 occurrences.
    assert.ok(
        RecurrenceService.genererOccurrences(
            creerEvenement({
                recurrenceFrequency: "daily",
                recurrenceEndDate: "2026-12-31"
            })
        ).length === 365
    );
});

// 7 bis. Une occurrence chevauchant le début de la période est incluse.
tester("Occurrence commencée avant la période", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            start: "2026-01-01T22:00:00.000Z",
            end: "2026-01-02T02:00:00.000Z",
            recurrenceFrequency: "weekly"
        }),
        {
            debut: "2026-01-09T00:00:00.000Z",
            fin: "2026-01-10T00:00:00.000Z"
        }
    );

    assert.deepEqual(datesDesDebuts(resultat), ["2026-01-08T22:00:00.000Z"]);
});

// 7 ter. Exceptions : occurrence supprimée et occurrence modifiée.
tester("Occurrences supprimées et modifiées", () => {
    const resultat = RecurrenceService.genererOccurrences(
        creerEvenement({
            recurrenceFrequency: "daily",
            recurrenceEndDate: "2026-01-04"
        }),
        {
            exceptions: [
                { occurrenceStart: "2026-01-02T10:00:00.000Z", cancelled: true },
                {
                    occurrenceStart: "2026-01-03T10:00:00.000Z",
                    cancelled: false,
                    title: "Déplacé",
                    start: "2026-01-03T15:00:00.000Z",
                    end: "2026-01-03T16:00:00.000Z"
                }
            ]
        }
    );

    assert.deepEqual(datesDesDebuts(resultat), [
        "2026-01-01T10:00:00.000Z",
        "2026-01-03T15:00:00.000Z",
        "2026-01-04T10:00:00.000Z"
    ]);
    assert.equal(resultat[1].title, "Déplacé");
    assert.equal(resultat[1].modifiee, true);
    assert.equal(
        resultat[1].occurrenceStart.toISOString(),
        "2026-01-03T10:00:00.000Z"
    );
});

// 7 quater. Reconnaissance d'une occurrence d'origine.
tester("estOccurrence", () => {
    const evenement = creerEvenement({
        start: "2026-01-31T10:00:00.000Z",
        end: "2026-01-31T11:00:00.000Z",
        recurrenceFrequency: "monthly"
    });

    assert.equal(RecurrenceService.estOccurrence(evenement, "2026-02-28T10:00:00.000Z"), true);
    assert.equal(RecurrenceService.estOccurrence(evenement, "2040-03-31T10:00:00.000Z"), true);
    assert.equal(RecurrenceService.estOccurrence(evenement, "2026-02-27T10:00:00.000Z"), false);
    assert.equal(RecurrenceService.estOccurrence(evenement, "2025-12-31T10:00:00.000Z"), false);
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
