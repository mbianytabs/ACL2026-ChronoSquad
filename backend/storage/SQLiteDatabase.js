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
            if (this.get("PRAGMA user_version").user_version > 3) {
                throw new Error("Version SQLite plus récente que celle supportée par ce serveur.");
            }
            this.migrateUserIds();
            this.migrateEventTable();
            this.initializeSchema();
            if (this.get("PRAGMA user_version").user_version >= 1) this.connection.exec("PRAGMA user_version = 3");
        } catch (error) {
            this.close();
            throw error;
        }
    }

    migrateUserIds() {
        const column = this.all("PRAGMA table_info(user)").find(c => c.name === "id");
        if (!column || column.type === "INTEGER") return;
        const sql = readFileSync(new URL("./migrate-user-ids.sql", import.meta.url), "utf8");
        this.connection.exec("PRAGMA foreign_keys = OFF");
        try {
            this.transaction(() => {
                // Ne pas migrer une ancienne base déjà incohérente.
                if (this.all("PRAGMA foreign_key_check").length) throw new Error("Relations SQLite invalides avant migration.");
                const version = this.get("PRAGMA user_version").user_version;
                this.connection.exec(sql);
                if (this.all("PRAGMA foreign_key_check").length) throw new Error("Relations SQLite invalides après migration.");
                if (version === 1) this.connection.exec("PRAGMA user_version = 2");
            });
        } finally {
            this.connection.exec("PRAGMA foreign_keys = ON");
        }
    }

    migrateEventTable() {
        // Reconnaître l'ancienne table par sa relation avec agenda, sans garder
        // son ancien nom dans le code. Renommer conserve toutes ses lignes.
        const tables = this.all(`SELECT name FROM sqlite_schema
            WHERE type = 'table' AND name <> 'evenement' AND sql LIKE '%agenda_id%'`);
        if (!tables.length) return;
        if (tables.length !== 1 || this.get("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'evenement'")) {
            throw new Error("Plusieurs tables d'événements détectées : migration annulée pour préserver les données.");
        }
        const quote = name => '"' + name.replaceAll('"', '""') + '"';
        this.transaction(() => {
            this.connection.exec(`ALTER TABLE ${quote(tables[0].name)} RENAME TO evenement`);
            // schema.sql recrée l'index avec le nom correspondant à evenement.
            for (const index of this.all("SELECT name FROM pragma_index_list('evenement') WHERE origin = 'c'")) {
                this.connection.exec(`DROP INDEX ${quote(index.name)}`);
            }
            if (this.get("PRAGMA user_version").user_version > 0) this.connection.exec("PRAGMA user_version = 3");
        });
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
