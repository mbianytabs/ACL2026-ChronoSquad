import { test } from "node:test";
import assert from "node:assert/strict";
import { Evenement } from "../models/Evenement.js";
import { RecurrenceService } from "../services/RecurrenceService.js";

function creerEvenement(frequence, dateFin) {
    return new Evenement(
        null,
        "agenda1",
        "Réunion de projet",
        "2026-11-02T10:00:00.000Z",
        "2026-11-02T11:00:00.000Z",
        "Point hebdomadaire",
        "Salle 2",
        frequence,
        dateFin
    );
}

test("un événement récurrent conserve sa récurrence dans toJSON()", () => {
    const json = creerEvenement("weekly", "2026-12-31").toJSON();
    assert.equal(json.recurrenceFrequency, "weekly");
    assert.equal(json.recurrenceEndDate, "2026-12-31");
});

test("un événement ponctuel a une récurrence nulle", () => {
    const json = creerEvenement(null, null).toJSON();
    assert.equal(json.recurrenceFrequency, null);
    assert.equal(json.recurrenceEndDate, null);
});

test("la validation de la récurrence refuse les valeurs incorrectes", () => {
    assert.throws(() => creerEvenement(null, "2026-12-31"), /nécessite une fréquence/);
    assert.throws(() => creerEvenement("hourly", "2026-12-31"), /fréquence/);
    assert.throws(() => creerEvenement("weekly", "31/12/2026"), /YYYY-MM-DD/);
    assert.throws(() => creerEvenement("weekly", "2026-02-30"), /invalide/);
    assert.throws(() => creerEvenement("weekly", "2026-11-01"), /précéder/);
});

test("les occurrences hebdomadaires sont générées jusqu'à la date de fin", () => {
    const occurrences = RecurrenceService.genererOccurrences(creerEvenement("weekly", "2026-12-31"));
    assert.deepEqual(
        occurrences.map(o => o.debut.toISOString().slice(0, 10)),
        ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30",
            "2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"]
    );
    for (const o of occurrences) {
        assert.equal(o.fin - o.debut, 60 * 60 * 1000);
    }
});
