import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../app.js";
import { SQLiteDatabase } from "../storage/SQLiteDatabase.js";

/**
 * test d'intégration HTTP de la recherche
 * utilise la vraie application Express, une base SQLite en mémoire et
 * des sessions obtenues par les vraies routes d'inscription/connexion.
 */
let server;
let baseUrl;
let db;
let aliceCookie;
let bobCookie;

function request(path, { method = "GET", body, cookie } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (cookie) headers.Cookie = cookie;
    return fetch(baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

const ids = evenements => evenements.map(evenement => evenement.id);
const password = "PasswordTestUS10!";

async function createAccountAndLogin(username) {
    const registration = await request("/api/users", {
        method: "POST", body: { username, password }
    });
    assert.equal(registration.status, 201, `Inscription de ${username}`);
    const user = await registration.json();

    const login = await request("/api/auth/login", {
        method: "POST", body: { username, password }
    });
    assert.equal(login.status, 200, `Connexion de ${username}`);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie, `Cookie de session de ${username}`);
    return { userId: user.id, cookie };
}

function insertEvenement(id, agendaId, title, start, end,
    description = "", location = "", frequency = null, recurrenceEnd = null) {
    db.run(`INSERT INTO evenement
        (id, agenda_id, title, start, end, description, location,
         recurrence_frequency, recurrence_end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, agendaId, title, start, end, description, location, frequency, recurrenceEnd]);
}

before(async () => {
    db = new SQLiteDatabase(":memory:");
    app.locals.database = db;
    server = createServer(app);
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const alice = await createAccountAndLogin("alice_us10");
    const bob = await createAccountAndLogin("bob_us10");
    aliceCookie = alice.cookie;
    bobCookie = bob.cookie;

    const createdAt = "2026-10-01T00:00:00.000Z";
    for (const [id, owner] of [["a1", alice.userId], ["a2", alice.userId], ["a3", bob.userId]]) {
        db.run("INSERT INTO agenda (id, name, color, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
            [id, `Agenda ${id}`, "#3b82f6", owner, createdAt]);
    }

    insertEvenement("e1", "a1", "Réunion projet", "2026-11-02T10:00:00.000Z", "2026-11-02T11:00:00.000Z");
    insertEvenement("e2", "a2", "Cours", "2026-11-05T09:00:00.000Z", "2026-11-05T10:00:00.000Z", "Rapport de stage");
    insertEvenement("e3", "a1", "Atelier", "2026-11-10T14:00:00.000Z", "2026-11-10T16:00:00.000Z", "", "Campus Metz");
    insertEvenement("e4", "a3", "Réunion privée", "2026-11-02T10:00:00.000Z", "2026-11-02T11:00:00.000Z");
    insertEvenement("e5", "a1", "Point hebdo", "2026-10-01T09:00:00.000Z", "2026-10-01T10:00:00.000Z", "", "", "weekly", "2030-12-31");
});

after(async () => {
    if (server?.listening) {
        await new Promise((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve());
        });
    }
    db?.close();
    delete app.locals.database;
});

test("GET /api/evenements/search refuse les visiteurs non connectés (401)", async () => {
    const response = await request("/api/evenements/search?q=projet");
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Connexion requise." });
    assert.equal(response.headers.get("cache-control"), "no-store");
});

test("recherche HTTP : titre, description et lieu", async () => {
    const scenarios = [
        ["r%C3%A9UNION", ["e1"]],
        ["rapport", ["e2"]],
        ["metz", ["e3"]]
    ];
    for (const [text, expectedIds] of scenarios) {
        const response = await request(`/api/evenements/search?q=${text}`, { cookie: aliceCookie });
        assert.equal(response.status, 200, text);
        assert.match(response.headers.get("content-type"), /application\/json/);
        assert.deepEqual(ids(await response.json()), expectedIds, text);
    }
});

test("recherche HTTP : plusieurs agendas et isolation entre utilisateurs", async () => {
    const alice = await request("/api/evenements/search?agendaIds=a1,a2&q=rapport", { cookie: aliceCookie });
    assert.equal(alice.status, 200);
    assert.deepEqual(ids(await alice.json()), ["e2"]);

    const repetitions = await request("/api/evenements/search?agendaIds=a1&agendaIds=a2&q=rapport", { cookie: aliceCookie });
    assert.equal(repetitions.status, 200);
    assert.deepEqual(ids(await repetitions.json()), ["e2"]);

    const forbidden = await request("/api/evenements/search?agendaIds=a3&q=r%C3%A9union", { cookie: aliceCookie });
    assert.equal(forbidden.status, 200);
    assert.deepEqual(await forbidden.json(), []);

    const bob = await request("/api/evenements/search?q=r%C3%A9union", { cookie: bobCookie });
    assert.equal(bob.status, 200);
    assert.deepEqual(ids(await bob.json()), ["e4"]);
});

test("recherche HTTP : dates facultatives, bornes inclusives et récurrence", async () => {
    const day = await request("/api/evenements/search?startDate=2026-11-05&endDate=2026-11-05", { cookie: aliceCookie });
    assert.equal(day.status, 200);
    assert.deepEqual(ids(await day.json()), ["e5", "e2"]);

    const after = await request("/api/evenements/search?startDate=2026-11-11", { cookie: aliceCookie });
    assert.equal(after.status, 200);
    assert.deepEqual(ids(await after.json()), ["e5"]);

    const before = await request("/api/evenements/search?endDate=2026-09-30", { cookie: aliceCookie });
    assert.equal(before.status, 200);
    assert.deepEqual(await before.json(), []);
});

test("recherche HTTP : filtres combinés et format JSON", async () => {
    const response = await request(
        "/api/evenements/search?q=projet&agendaIds=a1,a2&startDate=2026-11-01&endDate=2026-11-30",
        { cookie: aliceCookie }
    );
    assert.equal(response.status, 200);
    const resultats = await response.json();
    assert.deepEqual(ids(resultats), ["e1"]);
    assert.equal(resultats[0].title, "Réunion projet");
    assert.equal(resultats[0].agendaId, "a1");
    assert.equal(resultats[0].start, "2026-11-02T10:00:00.000Z");
});

test("recherche HTTP : paramètres incorrects retournent 400 JSON", async () => {
    const paths = [
        "/api/evenements/search?startDate=demain",
        "/api/evenements/search?startDate=2026-02-30",
        "/api/evenements/search?startDate=2026-12-01&endDate=2026-11-01",
        "/api/evenements/search?agendaIds=a1,,a2",
        "/api/evenements/search?q=a&q=b"
    ];
    for (const path of paths) {
        const response = await request(path, { cookie: aliceCookie });
        assert.equal(response.status, 400, path);
        const result = await response.json();
        assert.equal(typeof result.error, "string", path);
    }
});

test("GET /api/evenements existant reste inchangé", async () => {
    const response = await request("/api/evenements", { cookie: aliceCookie });
    assert.equal(response.status, 200);
    assert.deepEqual(ids(await response.json()), ["e5", "e1", "e2", "e3"]);
});
