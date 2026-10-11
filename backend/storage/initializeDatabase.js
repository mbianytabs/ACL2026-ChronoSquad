import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import argon2 from "argon2";
import { User } from "../models/User.js";
import { Agenda } from "../models/Agenda.js";
import { Evenement } from "../models/Evenement.js";
import { getDatabase } from "./SQLiteDatabase.js";

const legacyDirectory = fileURLToPath(new URL("../../data/", import.meta.url));

export async function seedTestData(db = getDatabase()) {
    const sql = await readFile(new URL("./test-data.sql", import.meta.url), "utf8");
    db.transaction(() => db.connection.exec(sql));
}

async function readLegacy(directory, name) {
    try {
        const records = JSON.parse(await readFile(join(directory, name), "utf8"));
        if (!Array.isArray(records)) throw new Error(`${name} doit contenir un tableau JSON.`);
        return records;
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}

// Import unique : user_version=1 n'est enregistré qu'après un import réussi.
// Les JSON originaux restent intacts mais ne sont plus utilisés ensuite.
export async function initializeDatabase(db = getDatabase(), directory = legacyDirectory) {
    if (db.get("PRAGMA user_version").user_version === 1) return { imported: false };

    const [userRecords, agendaRecords, evenementRecords] = await Promise.all([
        readLegacy(directory, "users.json"),
        readLegacy(directory, "agendas.json"),
        readLegacy(directory, "evenements.json")
    ]);

    // Le hachage asynchrone se fait avant la transaction synchrone SQLite.
    const users = [];
    for (const record of userRecords) {
        let hash = record.passwordHash;
        if (typeof hash !== "string" || !hash) throw new Error("Mot de passe historique manquant.");
        if (!hash.startsWith("$argon2")) {
            if (hash.startsWith("$")) throw new Error("Format de hash historique non pris en charge : import annulé.");
            hash = await argon2.hash(hash);
        }
        users.push(new User(record.id, record.username, hash, record.createdAt));
    }
    const agendas = agendaRecords.map(r => new Agenda(r.id, r.name, r.ownerId, r.color, r.createdAt));
    const evenements = evenementRecords.map(r => new Evenement(r.id, r.agendaId, r.title, r.start, r.end, r.description, r.location));

    return db.transaction(() => {
        // Revérifier après les await : protège aussi contre deux initialisations simultanées.
        if (db.get("PRAGMA user_version").user_version === 1) return { imported: false };
        const count = db.get(`SELECT (SELECT count(*) FROM user) + (SELECT count(*) FROM agenda)
            + (SELECT count(*) FROM rendezvous) AS total`).total;
        if (count !== 0) throw new Error("Import JSON refusé : la base non initialisée contient déjà des données.");

        for (const user of users) {
            const r = user.toRecord();
            db.run("INSERT INTO user (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
                [r.id, r.username, r.passwordHash, r.createdAt.toISOString()]);
        }
        for (const r of agendas) {
            db.run("INSERT INTO agenda (id, name, color, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
                [r.id, r.name, r.color, r.ownerId, r.createdAt.toISOString()]);
        }
        for (const r of evenements) {
            db.run(`INSERT INTO rendezvous (id, agenda_id, title, start, end, description, location)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [r.id, r.agendaId, r.title, r.start.toISOString(), r.end.toISOString(), r.description, r.location]);
        }
        db.connection.exec("PRAGMA user_version = 1");
        return { imported: true, users: users.length, agendas: agendas.length, rendezvous: evenements.length };
    });
}
