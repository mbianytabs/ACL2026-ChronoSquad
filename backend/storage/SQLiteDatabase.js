
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultPath = fileURLToPath(
    new URL("../../data/chronosquad.sqlite", import.meta.url)
);

export class SQLiteDatabase {
    constructor(filePath = defaultPath) {
        this.filePath = filePath === ":memory:" ? filePath : resolve(filePath);

        if (this.filePath !== ":memory:") {
            mkdirSync(dirname(this.filePath), { recursive: true });
        }

        this.connection = new DatabaseSync(this.filePath);

        try {
            this.connection.exec(
                "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;"
            );

            if (this.get("PRAGMA user_version").user_version > 3) {
                throw new Error(
                    "Version SQLite plus récente que celle supportée par ce serveur."
                );
            }

            this.migrateUserIds();
            this.migrateEventTable();
            this.initializeSchema();
            this.migrateEventRecurrence();
            this.migrateYearlyRecurrence();

            if (this.get("PRAGMA user_version").user_version >= 1) {
                this.connection.exec("PRAGMA user_version = 3");
            }
        } catch (error) {
            this.close();
            throw error;
        }
    }

    migrateUserIds() {
        const column = this.all("PRAGMA table_info(user)")
            .find(c => c.name === "id");

        if (!column || column.type === "INTEGER") {
            return;
        }

        const sql = readFileSync(
            new URL("./migrations/migrate-user-ids.sql", import.meta.url),
            "utf8"
        );

        this.connection.exec("PRAGMA foreign_keys = OFF");

        try {
            this.transaction(() => {
                if (this.all("PRAGMA foreign_key_check").length > 0) {
                    throw new Error(
                        "Relations SQLite invalides avant migration."
                    );
                }

                const version = this.get(
                    "PRAGMA user_version"
                ).user_version;

                this.connection.exec(sql);

                if (this.all("PRAGMA foreign_key_check").length > 0) {
                    throw new Error(
                        "Relations SQLite invalides après migration."
                    );
                }

                if (version === 1) {
                    this.connection.exec("PRAGMA user_version = 2");
                }
            });
        } finally {
            this.connection.exec("PRAGMA foreign_keys = ON");
        }
    }

    migrateEventTable() {
        const tables = this.all(`
            SELECT name
            FROM sqlite_schema
            WHERE type = 'table'
              AND name <> 'evenement'
              AND sql LIKE '%agenda_id%'
        `);

        if (tables.length === 0) {
            return;
        }

        if (
            tables.length !== 1 ||
            this.get(`
                SELECT name
                FROM sqlite_schema
                WHERE type = 'table'
                  AND name = 'evenement'
            `)
        ) {
            throw new Error(
                "Plusieurs tables d'événements détectées : migration annulée pour préserver les données."
            );
        }

        const quote = name => '"' + name.replaceAll('"', '""') + '"';

        this.transaction(() => {
            this.connection.exec(
                `ALTER TABLE ${quote(tables[0].name)} RENAME TO evenement`
            );

            for (const index of this.all(
                "SELECT name FROM pragma_index_list('evenement') WHERE origin = 'c'"
            )) {
                this.connection.exec(`DROP INDEX ${quote(index.name)}`);
            }

            if (this.get("PRAGMA user_version").user_version > 0) {
                this.connection.exec("PRAGMA user_version = 3");
            }
        });
    }

    initializeSchema() {
        const schema = readFileSync(
            new URL("./schema.sql", import.meta.url),
            "utf8"
        );

        this.transaction(() => {
            this.connection.exec(schema);
        });
    }

    migrateEventRecurrence() {
        const migrationSql = readFileSync(
            new URL(
                "./migrations/004-event-recurrence.sql",
                import.meta.url
            ),
            "utf8"
        );

        const statements = migrationSql
            .split(";")
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0);

        const columns = new Set(
            this.all("PRAGMA table_info(evenement)")
                .map(column => column.name)
        );

        const pendingStatements = [];

        for (const statement of statements) {
            const match = statement.match(
                /ADD\s+COLUMN\s+([a-z_][a-z0-9_]*)/i
            );

            if (!match) {
                throw new Error(
                    "Instruction SQL inattendue dans 004-event-recurrence.sql."
                );
            }

            const columnName = match[1].toLowerCase();

            if (!columns.has(columnName)) {
                pendingStatements.push(statement);
                columns.add(columnName);
            }
        }

        if (pendingStatements.length === 0) {
            return;
        }

        this.transaction(() => {
            for (const statement of pendingStatements) {
                this.connection.exec(statement);
            }
        });

        console.log(
            "Migration 004 : colonnes de récurrence ajoutées."
        );
    }

    migrateYearlyRecurrence() {
        const columns = this.all("PRAGMA table_info(evenement)")
            .map(column => column.name);

        if (columns.length === 0) {
            return;
        }

        const table = this.get(`
            SELECT sql
            FROM sqlite_schema
            WHERE type = 'table'
              AND name = 'evenement'
        `);

        if (!table) {
            return;
        }

        // Ne rien faire si la récurrence annuelle est déjà autorisée.
        if (table.sql.includes("'yearly'")) {
            return;
        }

        const requiredColumns = [
            "id",
            "agenda_id",
            "title",
            "start",
            "end",
            "location",
            "description",
            "recurrence_frequency",
            "recurrence_end_date"
        ];

        if (!requiredColumns.every(column => columns.includes(column))) {
            throw new Error(
                "Migration 005 impossible : structure de la table evenement inattendue."
            );
        }

        // Désactiver les clés étrangères avant de commencer la transaction.
        this.connection.exec("PRAGMA foreign_keys = OFF");

        try {
            this.transaction(() => {
                const migrationSql = readFileSync(
                    new URL(
                        "./migrations/005-yearly-recurrence.sql",
                        import.meta.url
                    ),
                    "utf8"
                );

                // Ce fichier ne doit pas contenir BEGIN ni COMMIT :
                // la transaction est gérée par cette classe.
                this.connection.exec(migrationSql);
            });
        } finally {
            // Toujours réactiver les clés étrangères.
            this.connection.exec("PRAGMA foreign_keys = ON");
        }

        // Vérifier les relations après la migration et la réactivation.
        const foreignKeyErrors = this.all("PRAGMA foreign_key_check");

        if (foreignKeyErrors.length > 0) {
            throw new Error(
                "Migration 005 : les relations SQLite sont invalides."
            );
        }

        console.log(
            "Migration 005 : la récurrence annuelle est maintenant autorisée."
        );
    }

    get(sql, params = []) {
        return this.connection.prepare(sql).get(...params);
    }

    all(sql, params = []) {
        return this.connection.prepare(sql).all(...params);
    }

    run(sql, params = []) {
        return this.connection.prepare(sql).run(...params);
    }

    transaction(action) {
        if (action.constructor.name === "AsyncFunction") {
            throw new TypeError(
                "Une transaction SQLite attend une fonction synchrone."
            );
        }

        this.connection.exec("BEGIN IMMEDIATE");

        try {
            const result = action();

            if (result && typeof result.then === "function") {
                throw new TypeError(
                    "Une transaction SQLite ne doit pas renvoyer de Promise."
                );
            }

            this.connection.exec("COMMIT");
            return result;
        } catch (error) {
            this.connection.exec("ROLLBACK");
            throw error;
        }
    }

    close() {
        if (this.connection.isOpen) {
            this.connection.close();
        }
    }
}

let database;

export function getDatabase() {
    database ??= new SQLiteDatabase();
    return database;
}

export function closeDatabase() {
    database?.close();
    database = undefined;
}
