import { test } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDatabase } from "../storage/SQLiteDatabase.js";
import { Evenement } from "../models/Evenement.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";
import { RecurrenceService } from "../services/RecurrenceService.js";

// Base en mémoire : le test ne touche pas data/chronosquad.sqlite.
function createFixture() {
    const db = new SQLiteDatabase(":memory:");
    const createdAt = "2026-10-01T10:00:00.000Z";
    db.run("INSERT INTO user (id, username, password_hash, created_at) VALUES (1, 'alice', 'hash', ?)",
        [createdAt]);
    db.run("INSERT INTO agenda (id, name, color, owner_id, created_at) VALUES ('a1', 'Personnel', '#3b82f6', 1, ?)",
        [createdAt]);
    return { db, repository: new EvenementRepository(db) };
}

test("la récurrence annuelle est persistée puis ses occurrences sont calculées", async () => {
    const { db, repository } = createFixture();
    try {
        const evenement = new Evenement(
            null,
            "a1",
            "Test récurrence annuelle",
            "2026-11-10T10:00:00.000Z",
            "2026-11-10T11:00:00.000Z",
            "Événement créé par le test",
            "Nancy",
            "yearly",
            "2028-11-10"
        );

        const cree = await repository.create(evenement);
        const relu = await repository.findById(cree.id);

        assert.equal(relu.recurrenceFrequency, "yearly");
        assert.equal(relu.recurrenceEndDate, "2028-11-10");

        const occurrences = RecurrenceService.genererOccurrences(relu, 100);
        assert.deepEqual(
            occurrences.map(o => o.debut.toISOString()),
            ["2026-11-10T10:00:00.000Z", "2027-11-10T10:00:00.000Z", "2028-11-10T10:00:00.000Z"]
        );
    } finally {
        db.close();
    }
});

test("une base SQLite refuse une fréquence de récurrence inconnue", () => {
    const { db } = createFixture();
    try {
        assert.throws(() => db.run(`INSERT INTO evenement (id, agenda_id, title, start, end, recurrence_frequency)
            VALUES ('e1', 'a1', 'Test', '2026-11-10T10:00:00.000Z', '2026-11-10T11:00:00.000Z', 'hourly')`),
        /CHECK constraint failed/);
    } finally {
        db.close();
    }
});
