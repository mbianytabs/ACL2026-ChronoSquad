import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Script } from "node:vm";
import argon2 from "argon2";
import { app } from "../app.js";
import { SQLiteDatabase } from "../storage/SQLiteDatabase.js";

let server;
let baseUrl;
before(async () => {
    app.locals.database = new SQLiteDatabase(":memory:");
    server = createServer(app);
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    app.locals.database.close();
    delete app.locals.database;
});

function request(path, { method = "GET", body, cookie, origin } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (cookie) headers.Cookie = cookie;
    if (origin) headers.Origin = origin;
    return fetch(baseUrl + path, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body)
    });
}
const credentials = (username, password = "MonMotDePasse123!") => ({ username, password });
const sessionCookie = response => response.headers.get("set-cookie")?.split(";")[0];
function assertPublicUser(user) {
    assert.deepEqual(Object.keys(user).sort(), ["createdAt", "id", "username"]);
}

test("inscription : identifiants 1, 2 générés par SQLite, hash salé et réponse publique", async () => {
    const body = { ...credentials("  alice_auth  "), id: "id-impose", passwordHash: "hash-impose" };
    const response = await request("/api/users", { method: "POST", body });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(sessionCookie(response), undefined);
    const user = await response.json();
    assertPublicUser(user);
    assert.equal(user.username, "alice_auth");
    assert.equal(user.id, 1);
    assert.notEqual(user.id, "id-impose");
    const record = app.locals.database.get("SELECT * FROM user WHERE id = ?", [user.id]);
    assert.match(record.password_hash, /^\$argon2id\$/);
    assert.equal(await argon2.verify(record.password_hash, body.password), true);
    assert.equal((await request("/api/users/me")).status, 401);

    const other = await request("/api/users", { method: "POST", body: credentials("other_auth") });
    assert.equal(other.status, 201);
    assert.equal((await other.json()).id, 2);
    const otherHash = app.locals.database.get("SELECT password_hash FROM user WHERE username = ?", ["other_auth"]).password_hash;
    assert.notEqual(record.password_hash, otherHash);
});

test("validation des champs, doublons et inscriptions concurrentes", async () => {
    for (const body of [null, {}, [], { username: 42, password: "long-password" },
        credentials("   "), credentials("a".repeat(51)), credentials("short", "abc"),
        credentials("blank", "        "), credentials("long", "a".repeat(129))]) {
        const response = await request("/api/users", { method: "POST", body });
        assert.equal(response.status, 400);
        assert.equal(typeof (await response.json()).error, "string");
    }
    const duplicate = await request("/api/users", { method: "POST", body: credentials("alice_auth") });
    assert.equal(duplicate.status, 409);
    const simultaneous = await Promise.all([1, 2].map(() => request("/api/users", {
        method: "POST", body: credentials("concurrent_auth")
    })));
    assert.deepEqual(simultaneous.map(r => r.status).sort(), [201, 409]);
    assert.equal(app.locals.database.get("SELECT count(*) AS n FROM user WHERE username = ?", ["concurrent_auth"]).n, 1);
});

test("connexion : cookie HttpOnly, identification, clients séparés, rotation et déconnexion", async () => {
    const login = await request("/api/auth/login", { method: "POST", body: credentials("alice_auth") });
    assert.equal(login.status, 200);
    assertPublicUser(await login.json());
    assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(login.headers.get("set-cookie"), /SameSite=Lax/i);
    const cookie = sessionCookie(login);
    assert.ok(cookie);
    const me = await request("/api/users/me", { cookie });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).username, "alice_auth");
    assert.equal((await request("/api/users/me")).status, 401);
    assert.equal((await request("/api/users/me", { cookie: cookie + "tampered" })).status, 401);

    const secondLogin = await request("/api/auth/login", {
        method: "POST", body: credentials("alice_auth"), cookie
    });
    const newCookie = sessionCookie(secondLogin);
    assert.notEqual(newCookie, cookie);
    assert.equal((await request("/api/users/me", { cookie })).status, 401);
    assert.equal((await request("/api/users/me", { cookie: newCookie })).status, 200);
    const logout = await request("/api/auth/logout", { method: "POST", cookie: newCookie });
    assert.equal(logout.status, 204);
    assert.equal(await logout.text(), "");
    assert.match(logout.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/i);
    assert.equal((await request("/api/users/me", { cookie: newCookie })).status, 401);
    assert.equal((await request("/api/auth/logout", { method: "POST" })).status, 204);
});

test("mauvais identifiants : 401 identique, aucune session ; origine externe refusée", async () => {
    for (const body of [credentials("alice_auth", "incorrect"), credentials("absent_auth")]) {
        const response = await request("/api/auth/login", { method: "POST", body });
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: "Identifiants invalides." });
        assert.equal(sessionCookie(response), undefined);
    }
    assert.equal((await request("/api/auth/login", { method: "POST", body: {} })).status, 400);
    for (const path of ["/api/users", "/api/auth/login", "/api/auth/logout"]) {
        assert.equal((await request(path, {
            method: "POST", body: credentials("external_auth"), origin: "https://external.example"
        })).status, 403);
    }
    const response = await request("/api/auth/login", {
        method: "POST", body: credentials("alice_auth"), origin: baseUrl
    });
    assert.equal(response.status, 200);
    await request("/api/auth/logout", { method: "POST", cookie: sessionCookie(response) });
});

test("un compte supprimé n'est plus identifié, même avec un cookie valide", async () => {
    await request("/api/users", { method: "POST", body: credentials("deleted_auth") });
    const login = await request("/api/auth/login", { method: "POST", body: credentials("deleted_auth") });
    const cookie = sessionCookie(login);
    app.locals.database.run("DELETE FROM user WHERE username = ?", ["deleted_auth"]);
    assert.equal((await request("/api/users/me", { cookie })).status, 401);
    await request("/api/auth/logout", { method: "POST", cookie });
});

test("page temporaire sans CSS : formulaire et JavaScript de simulation valides", async () => {
    const response = await request("/test/auth");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('id="register-test"'));
    assert.ok(html.includes('id="login-test"'));
    assert.ok(!html.includes("stylesheet"));
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    assert.doesNotThrow(() => new Script(script));
});
