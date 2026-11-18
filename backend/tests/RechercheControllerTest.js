import { test } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDatabase } from "../storage/SQLiteDatabase.js";
import { EvenementController } from "../controllers/EvenementController.js";
import { Evenement } from "../models/Evenement.js";
import { evenementChevauchePeriode } from "../services/RechercheService.js";

function fixture() {
    const db = new SQLiteDatabase(":memory:");
    const createdAt = "2026-10-01T00:00:00.000Z";
    for (const [id, name] of [[1, "alice"], [2, "bob"]]) {
        db.run("INSERT INTO user (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
            [id, name, "hash", createdAt]);
    }
    for (const [id, owner] of [["a1", 1], ["a2", 1], ["a3", 2]]) {
        db.run("INSERT INTO agenda (id, name, color, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
            [id, `Agenda ${id}`, "#3b82f6", owner, createdAt]);
    }
    const insert = (id, agenda, title, start, end, description = "", location = "",
        frequency = null, recurrenceEnd = null) => {
        db.run(`INSERT INTO evenement
            (id, agenda_id, title, start, end, description, location,
             recurrence_frequency, recurrence_end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, agenda, title, start, end, description, location, frequency, recurrenceEnd]);
    };
    insert("e1", "a1", "Réunion projet", "2026-11-02T10:00:00.000Z", "2026-11-02T11:00:00.000Z");
    insert("e2", "a2", "Cours", "2026-11-05T09:00:00.000Z", "2026-11-05T10:00:00.000Z", "Rapport de stage");
    insert("e3", "a1", "Atelier", "2026-11-10T14:00:00.000Z", "2026-11-10T16:00:00.000Z", "", "Campus Metz");
    insert("e4", "a3", "Réunion privée", "2026-11-02T10:00:00.000Z", "2026-11-02T11:00:00.000Z");
    insert("e5", "a1", "Point hebdo", "2026-10-01T09:00:00.000Z", "2026-10-01T10:00:00.000Z", "", "", "weekly", "2030-12-31");
    insert("e6", "a2", "Récurrence sans fin", "2026-10-01T12:00:00.000Z", "2026-10-01T13:00:00.000Z", "", "", "weekly", null);
    return db;
}

async function search(db, query = {}, userId = 1) {
    const req = { query, user: { id: userId }, app: { locals: { database: db } } };
    let payload;
    const res = { json: value => { payload = value; } };
    await EvenementController.searchEvenements(req, res);
    return payload;
}

const ids = rows => rows.map(row => row.id);

test("controller : texte et plusieurs agendas, avec isolation du propriétaire", async () => {
    const db = fixture();
    try {
        assert.deepEqual(ids(await search(db, { q: "réUNION" })), ["e1"]);
        assert.deepEqual(ids(await search(db, { q: "rapport", agendaIds: "a2" })), ["e2"]);
        assert.deepEqual(ids(await search(db, { q: "metz", agendaIds: ["a1", "a2"] })), ["e3"]);
        assert.deepEqual(ids(await search(db, { q: "réunion", agendaIds: "a1,a3" })), ["e1"]);
        assert.deepEqual(ids(await search(db, { q: "réunion" }, 2)), ["e4"]);
        assert.deepEqual(ids(await search(db, { q: "rapport", agendaIds: "a1" })), []);
    } finally { db.close(); }
});

test("controller : dates facultatives et occurrences réelles", async () => {
    const db = fixture();
    try {
        assert.deepEqual(ids(await search(db, { startDate: "2026-11-05", endDate: "2026-11-05" })), ["e5", "e2"]);
        assert.deepEqual(ids(await search(db, { startDate: "2026-11-06", endDate: "2026-11-06" })), []);
        assert.deepEqual(ids(await search(db, { startDate: "2026-11-11" })), ["e5"]);
        assert.deepEqual(ids(await search(db, { endDate: "2026-09-30" })), []);
        // Plus de 100 occurrences hebdomadaires après l'origine, sans limite arbitraire.
        assert.deepEqual(ids(await search(db, { startDate: "2029-12-27", endDate: "2029-12-27" })), ["e5"]);
        assert.deepEqual(ids(await search(db, { startDate: "2026-10-08", endDate: "2026-10-08", q: "sans fin" })), []);
    } finally { db.close(); }
});

test("controller : dates et paramètres incorrects donnent une erreur 400", async () => {
    const db = fixture();
    try {
        for (const query of [
            { startDate: "2026-02-30" },
            { startDate: "demain" },
            { endDate: "2026-13-10" },
            { startDate: "2026-12-01", endDate: "2026-11-01" },
            { q: ["mot1", "mot2"] },
            { q: "a".repeat(201) },
            { agendaIds: "a1,,a2" },
            { agendaIds: { bad: true } },
            { startDate: ["2026-11-01", "2026-11-02"] }
        ]) {
            await assert.rejects(() => search(db, query), error => error.status === 400,
                JSON.stringify(query));
        }
    } finally { db.close(); }
});

test("controller : sans filtre, renvoie tous les événements propres à l'utilisateur", async () => {
    const db = fixture();
    try {
        assert.deepEqual(ids(await search(db)), ["e5", "e6", "e1", "e2", "e3"]);
        const rows = await search(db, { agendaIds: "a1,a1", q: "reunion" });
        assert.deepEqual(rows, []); // La recherche actuelle ne neutralise pas les accents.
    } finally { db.close(); }
});

// Ces scénarios vérifient les règles calendaires de l'US09 sans toucher à son service.
test("service : chevauchements, fins de mois et années bissextiles", () => {
    const nuit = new Evenement("n", "a1", "Nuit",
        "2026-10-31T23:00:00.000Z", "2026-11-01T01:00:00.000Z");
    assert.equal(evenementChevauchePeriode(nuit, "2026-11-01", "2026-11-01"), true);
    assert.equal(evenementChevauchePeriode(nuit, "2026-11-02", "2026-11-02"), false);

    const mensuel = new Evenement("m", "a1", "Mensuel",
        "2026-01-31T09:00:00.000Z", "2026-01-31T10:00:00.000Z",
        "", "", "monthly", "2026-12-31");
    assert.equal(evenementChevauchePeriode(mensuel, "2026-02-28", "2026-02-28"), true);
    assert.equal(evenementChevauchePeriode(mensuel, "2026-02-27", "2026-02-27"), false);

    const annuel = new Evenement("y", "a1", "Annuel",
        "2024-02-29T10:00:00.000Z", "2024-02-29T11:00:00.000Z",
        "", "", "yearly", "2028-12-31");
    assert.equal(evenementChevauchePeriode(annuel, "2025-02-28", "2025-02-28"), true);
    assert.equal(evenementChevauchePeriode(annuel, "2025-03-01", "2025-03-01"), false);
});
