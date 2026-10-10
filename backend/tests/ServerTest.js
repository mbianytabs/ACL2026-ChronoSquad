import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import express from "express";
import { app } from "../app.js";
import { errorHandler } from "../middleware/ErrorHandler.js";

let server;
let baseUrl;

before(async () => {
    server = createServer(app);
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        // Port temporaire : les tests n'occupent pas le port de l'application.
        server.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server?.listening) {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});

test("la page principale et les ressources du front restent intactes", async () => {
    const files = [
        ["/?test=1", "index.html", "text/html"],
        ["/templates/register.html", "templates/register.html", "text/html"],
        ["/templates/agendas.html", "templates/agendas.html", "text/html"],
        ["/css/style.css?v=1", "css/style.css", "text/css"],
        ["/js/api.js?v=1", "js/api.js", "javascript"]
    ];
    for (const [url, file, contentType] of files) {
        const response = await fetch(baseUrl + url);
        assert.equal(response.status, 200, url);
        assert.ok(response.headers.get("content-type").includes(contentType), url);
        assert.equal(await response.text(),
            await readFile(new URL(`../../public/${file}`, import.meta.url), "utf8"));
    }
});

test("l'état du serveur est accessible en JSON", async () => {
    const response = await fetch(baseUrl + "/api/health");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.deepEqual(await response.json(), { status: "ok" });
});

test("les routes API inconnues renvoient une 404 JSON", async () => {
    for (const url of ["/api", "/api/inconnue", "/API/inconnue?x=1"]) {
        const response = await fetch(baseUrl + url);
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: "Route API introuvable." });
    }
    const response = await fetch(baseUrl + "/api/health", { method: "POST" });
    assert.equal(response.status, 404);
});

test("les pages inconnues sont rendues par EJS avec le statut 404", async () => {
    const response = await fetch(baseUrl + "/inconnue");
    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type"), /text\/html/);
    const html = await response.text();
    assert.match(html, /<h1>Erreur 404<\/h1>/);
    assert.ok(!html.includes("<%"));
});

test("le serveur refuse les corps JSON invalides et trop volumineux", async () => {
    const invalid = await fetch(baseUrl + "/api/inconnue", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{"
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), {
        error: "Le corps JSON de la requête est invalide."
    });
    const oversized = await fetch(baseUrl + "/api/inconnue", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "x".repeat(110000) })
    });
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), {
        error: "Le corps de la requête est trop volumineux."
    });
    assert.equal((await fetch(baseUrl + "/api/health")).status, 200);
});

test("les sources et les données ne sont jamais servies comme fichiers publics", async () => {
    for (const url of ["/backend/server.js", "/data/users.json", "/package.json", "/.git/config"]) {
        const response = await fetch(baseUrl + url);
        assert.equal(response.status, 404, url);
    }
});

test("les erreurs asynchrones passent par le gestionnaire sans fuite technique", async () => {
    // Application de test isolée : aucune route de panne ajoutée au vrai serveur.
    const isolated = express();
    isolated.set("views", app.get("views"));
    isolated.set("view engine", "ejs");
    isolated.get("/api/failure", async () => {
        throw new Error("Information interne confidentielle");
    });
    isolated.get("/escaped", () => {
        const error = new Error("<script>alert('test')</script>");
        error.status = 400;
        error.expose = true;
        throw error;
    });
    isolated.use(errorHandler);
    const isolatedServer = createServer(isolated);
    await new Promise((resolve) => isolatedServer.listen(0, "127.0.0.1", resolve));
    try {
        const origin = `http://127.0.0.1:${isolatedServer.address().port}`;
        const failure = await fetch(origin + "/api/failure");
        assert.equal(failure.status, 500);
        assert.deepEqual(await failure.json(), { error: "Erreur interne du serveur." });
        const escaped = await fetch(origin + "/escaped");
        assert.equal(escaped.status, 400);
        const html = await escaped.text();
        assert.ok(html.includes("&lt;script&gt;"));
        assert.ok(!html.includes("<script>"));
    } finally {
        await new Promise((resolve, reject) => {
            isolatedServer.close((error) => error ? reject(error) : resolve());
        });
    }
});
