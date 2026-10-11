import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import argon2 from "argon2";
import { SQLiteDatabase } from "../storage/SQLiteDatabase.js";
import { initializeDatabase } from "../storage/initializeDatabase.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { EvenementRepository } from "../repositories/EvenementRepository.js";
import { User } from "../models/User.js";
import { Agenda } from "../models/Agenda.js";
import { Evenement } from "../models/Evenement.js";

const date = "2026-10-11T10:00:00.000Z";
const makeEvent = (id, agendaId = "a1") => new Evenement(id, agendaId, "Cours", date, "2026-10-11T11:00:00.000Z");

test("tables au singulier, relations SQL, objets métier et CRUD des rendez-vous", async () => {
    const db = new SQLiteDatabase(":memory:");
    try {
        assert.deepEqual(db.all("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map(r => r.name),
            ["agenda", "rendezvous", "user"]);
        assert.equal(db.get("PRAGMA foreign_keys").foreign_keys, 1);
        const users = new UserRepository(db);
        const agendas = new AgendaRepository(db);
        const events = new EvenementRepository(db);
        const hash = await argon2.hash("secret");
        await users.create(new User("u1", "alice", hash, date));
        await users.create(new User("u2", "bob", hash, date));
        const user = await users.findByUsername("alice");
        assert.ok(user instanceof User);
        assert.equal(await user.verifyPassword("secret"), true);
        assert.equal(await user.verifyPassword("wrong"), false);
        assert.equal(user.toRecord().passwordHash, hash);
        assert.equal(JSON.stringify(user).includes("passwordHash"), false);
        assert.equal(await users.findByUsername("' OR 1=1 --"), null);
        await assert.rejects(users.create(new User("u3", "alice", hash)), /UNIQUE/);
        await agendas.create(new Agenda("a1", "Personnel", "u1"));
        await agendas.create(new Agenda("a2", "Bob", "u2"));
        assert.deepEqual((await agendas.findByOwner("u1")).map(a => a.id), ["a1"]);
        assert.ok(await agendas.findById("a1") instanceof Agenda);
        await assert.rejects(agendas.create(new Agenda("bad", "Invalide", "absent")), /FOREIGN KEY/);
        await events.create(makeEvent("e1"));
        await events.create(makeEvent("e2", "a2"));
        assert.deepEqual((await events.findByAgenda("a1")).map(e => e.id), ["e1"]);
        await assert.rejects(events.create(makeEvent("bad", "absent")), /FOREIGN KEY/);
        const event = await events.findById("e1");
        assert.ok(event instanceof Evenement);
        event.rename("Cours SQL");
        event.setLocation("Salle 101");
        assert.equal((await events.update("e1", event)).title, "Cours SQL");
        assert.equal((await events.findById("e1")).location, "Salle 101");
        assert.equal(await events.update("absent", event), null);
        assert.throws(() => db.run("DELETE FROM agenda WHERE id = ?", ["a1"]), /FOREIGN KEY/);
        assert.equal(await events.delete("e1"), true);
        assert.equal(await events.delete("e1"), false);
        assert.equal(await events.findById("e1"), null);
        assert.equal(await users.findById("absent"), null);
        assert.equal(await agendas.findById("absent"), null);
    } finally { db.close(); }
});

test("les transactions annulent toutes les écritures en cas d'erreur", () => {
    const db = new SQLiteDatabase(":memory:");
    try {
        assert.throws(() => db.transaction(() => {
            db.run("INSERT INTO user VALUES (?, ?, ?, ?)", ["u1", "alice", "hash", date]);
            db.run("INSERT INTO agenda VALUES (?, ?, ?, ?, ?)", ["a1", "Agenda", "#3b82f6", "absent", date]);
        }), /FOREIGN KEY/);
        assert.equal(db.get("SELECT count(*) AS n FROM user").n, 0);
        assert.throws(() => db.transaction(async () => {}), /synchrone/);
        assert.throws(() => db.transaction(() => {
            db.run("INSERT INTO user VALUES (?, ?, ?, ?)", ["u1", "alice", "hash", date]);
            return Promise.resolve();
        }), /Promise/);
        assert.equal(db.get("SELECT count(*) AS n FROM user").n, 0);
    } finally { db.close(); }
});

test("la base conserve les données après fermeture et réouverture", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chronosquad-sqlite-"));
    let db;
    try {
        const path = join(directory, "nested", "test.sqlite");
        db = new SQLiteDatabase(path);
        await new UserRepository(db).create(new User("u1", "alice", "hash", date));
        db.close();
        db = new SQLiteDatabase(path);
        assert.equal((await new UserRepository(db).findById("u1")).username, "alice");
    } finally {
        db?.close();
        await rm(directory, { recursive: true, force: true });
    }
});

test("import initial des vrais JSON, hachage et absence de réimport au redémarrage", async () => {
    const db = new SQLiteDatabase(":memory:");
    try {
        const result = await initializeDatabase(db);
        assert.deepEqual(result, { imported: true, users: 3, agendas: 3, rendezvous: 4 });
        const user = await new UserRepository(db).findById("user1");
        assert.equal(await user.verifyPassword("alice123"), true);
        assert.match(user.toRecord().passwordHash, /^\$argon2/);
        assert.deepEqual((await new AgendaRepository(db).findByOwner("user1")).map(a => a.id), ["agenda1", "agenda2"]);
        assert.equal((await new EvenementRepository(db).findByAgenda("agenda1")).length, 2);
        db.run("DELETE FROM rendezvous WHERE id = 'rdv1'");
        assert.deepEqual(await initializeDatabase(db), { imported: false });
        assert.equal(await new EvenementRepository(db).findById("rdv1"), null);
    } finally { db.close(); }
});

test("import invalide : rollback complet, JSON conservés et nouvelle tentative possible", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chronosquad-import-"));
    const db = new SQLiteDatabase(":memory:");
    const users = JSON.stringify([{ id: "u1", username: "alice", passwordHash: "secret", createdAt: date }]);
    try {
        await writeFile(join(directory, "users.json"), users);
        await writeFile(join(directory, "agendas.json"), JSON.stringify([
            { id: "a1", name: "Agenda", ownerId: "absent", color: "#3b82f6", createdAt: date }
        ]));
        await assert.rejects(initializeDatabase(db, directory), /FOREIGN KEY/);
        assert.equal(db.get("SELECT count(*) AS n FROM user").n, 0);
        assert.equal(db.get("PRAGMA user_version").user_version, 0);
        assert.equal(await readFile(join(directory, "users.json"), "utf8"), users);
        await writeFile(join(directory, "agendas.json"), "[]");
        assert.equal((await initializeDatabase(db, directory)).users, 1);
    } finally {
        db.close();
        await rm(directory, { recursive: true, force: true });
    }
});

test("sans fichiers historiques, initialisation vide et refus d'écraser une base existante", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chronosquad-empty-"));
    const db = new SQLiteDatabase(":memory:");
    try {
        await new UserRepository(db).create(new User("u1", "alice", "hash", date));
        await assert.rejects(initializeDatabase(db, directory), /contient déjà/);
        db.run("DELETE FROM user");
        assert.deepEqual(await initializeDatabase(db, directory), { imported: true, users: 0, agendas: 0, rendezvous: 0 });
        await writeFile(join(directory, "users.json"), "JSON invalide");
        assert.deepEqual(await initializeDatabase(db, directory), { imported: false });
    } finally {
        db.close();
        await rm(directory, { recursive: true, force: true });
    }
});
