import { test } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDatabase } from "../storage/SQLiteDatabase.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";

function createFixture() {
    const db = new SQLiteDatabase(":memory:");
    const createdAt = "2026-10-01T10:00:00.000Z";
    for (const [id, username] of [[1, "alice"], [2, "bob"]]) {
        db.run("INSERT INTO user (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
            [id, username, "hash", createdAt]);
    }
    for (const [id, name, owner] of [["a1", "Personnel", 1], ["a2", "Travail", 1], ["a3", "Privé Bob", 2]]) {
        db.run("INSERT INTO agenda (id, name, color, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
            [id, name, "#3b82f6", owner, createdAt]);
    }
    const insert = (id, agendaId, title, start, end, description = "", location = "", frequency = null, recurrenceEndDate = null) => {
        db.run(`INSERT INTO evenement
                (id, agenda_id, title, start, end, description, location, recurrence_frequency, recurrence_end_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, agendaId, title, start, end, description, location, frequency, recurrenceEndDate]);
    };
    insert("e1", "a1", "Réunion projet", "2026-11-02T10:00:00.000Z", "2026-11-02T11:00:00.000Z");
    insert("e2", "a2", "Cours", "2026-11-05T09:00:00.000Z", "2026-11-05T10:00:00.000Z", "Rapport de stage");
    insert("e3", "a1", "Atelier", "2026-11-10T14:00:00.000Z", "2026-11-10T16:00:00.000Z", "", "Campus Metz");
   insert("e4", "a3", "Réunion confidentielle", "2026-11-03T10:00:00.000Z", "2026-11-03T11:00:00.000Z");
    insert("e5", "a1", "Événement nocturne", "2026-10-31T23:00:00.000Z", "2026-11-01T01:00:00.000Z");
    insert("e6", "a1", "Termine à minuit", "2026-10-31T22:00:00.000Z", "2026-11-01T00:00:00.000Z");
    insert("e7", "a2", "Point récurrent", "2026-10-01T09:00:00.000Z", "2026-10-01T10:00:00.000Z", "", "", "weekly", "2026-12-31");
    return { db, repo: new EvenementRepository(db) };
}

const ids = rows => rows.map(row => row.id);

test("recherche textuelle dans le titre, la description et le lieu", async () => {
   const { db, repo } = createFixture();
   try {
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { query: "réUNION" })), ["e1"]);
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { query: "rapport" })), ["e2"]);
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { query: "metz" })), ["e3"]);
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { query: "  projet  " })), ["e1"]);
       assert.deepEqual(ids(await repo.findSearchCandidates(1, { query: "%" })), []);
       assert.deepEqual(ids(await repo.findSearchCandidates(1, { query: "' OR 1=1 --" })), []);
    } finally { db.close(); }
});

test("recherche sur un ou plusieurs agendas avec isolation des utilisateurs", async () => {
    const { db, repo } = createFixture();
    try {
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { agendaIds: ["a2"] })), ["e7", "e2"]);
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { agendaIds: ["a1", "a2"] })),
            ["e7", "e6", "e5", "e1", "e2", "e3"]);
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { agendaIds: ["a3"] })), []);
        assert.deepEqual(ids(await repo.findSearchCandidates(2, { query: "réunion" })), ["e4"]);
    } finally { db.close(); }
});

test("période, bornes inclusives en jours UTC et chevauchement", async () => {
    const { db, repo } = createFixture();
   try {
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { startDate: "2026-11-01", endDate: "2026-11-01" })),
            ["e7", "e5"]);
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { startDate: "2026-11-05" })),
            ["e7", "e2", "e3"]);
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { endDate: "2026-10-30" })), ["e7"]);
        assert.deepEqual(ids(await repo.findSearchCandidates(1, { startDate: "2026-11-05", endDate: "2026-11-05" })),
           ["e7", "e2"]);
    } finally { db.close(); }
});

test("combinaison des filtres et résultat vide", async () => {
    const { db, repo } = createFixture();
    try {
        assert.deepEqual(ids(await repo.findSearchCandidates(1, {
           query: "rapport", agendaIds: ["a2"], startDate: "2026-11-01", endDate: "2026-11-08"
       })), ["e2"]);
        assert.deepEqual(ids(await repo.findSearchCandidates(1, {
            query: "rapport", agendaIds: ["a1"]
        })), []);
   } finally { db.close(); }
});
