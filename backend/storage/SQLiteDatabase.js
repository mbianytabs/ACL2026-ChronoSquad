import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultPath = fileURLToPath(new URL("../../data/chronosquad.sqlite", import.meta.url));

export class SQLiteDatabase {
    constructor(filePath = defaultPath) {
        this.filePath = filePath === ":memory:" ? filePath : resolve(filePath);
        if (this.filePath !== ":memory:") mkdirSync(dirname(this.filePath), { recursive: true });
        this.connection = new DatabaseSync(this.filePath);
        try {
            this.connection.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
            if (this.get("PRAGMA user_version").user_version > 1) {
                throw new Error("Version SQLite plus récente que celle supportée par ce serveur.");
            }
            this.initializeSchema();
        } catch (error) {
            this.close();
            throw error;
        }
    }

    initializeSchema() {
        const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
        this.transaction(() => this.connection.exec(schema));
    }

    get(sql, params = []) { return this.connection.prepare(sql).get(...params); }
    all(sql, params = []) { return this.connection.prepare(sql).all(...params); }
    run(sql, params = []) { return this.connection.prepare(sql).run(...params); }

    // Les transactions sont synchrones : aucun await entre BEGIN et COMMIT.
    transaction(action) {
        if (action.constructor.name === "AsyncFunction") {
            throw new TypeError("Une transaction SQLite attend une fonction synchrone.");
        }
        this.connection.exec("BEGIN IMMEDIATE");
        try {
            const result = action();
            if (result && typeof result.then === "function") {
                throw new TypeError("Une transaction SQLite ne doit pas renvoyer de Promise.");
            }
            this.connection.exec("COMMIT");
            return result;
        } catch (error) {
            this.connection.exec("ROLLBACK");
            throw error;
        }
    }

    close() { if (this.connection.isOpen) this.connection.close(); }
}

let database;
// Une seule connexion partagée par les repositories du serveur.
export function getDatabase() {
    database ??= new SQLiteDatabase();
    return database;
}

export function closeDatabase() {
    database?.close();
    database = undefined;
}
