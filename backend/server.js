import { createServer } from "node:http";
import { app } from "./app.js";
import { getDatabase, closeDatabase } from "./storage/SQLiteDatabase.js";
import { initializeDatabase, seedTestData } from "./storage/initializeDatabase.js";

// Le sujet impose un serveur unique sur le port 3000.
const PORT = 3000;
const server = createServer(app);

server.on("close", closeDatabase);
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close());
}

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Le port ${PORT} est déjà utilisé. Arrêtez l'autre serveur puis relancez npm start.`);
    } else {
        console.error("Impossible de démarrer le serveur :", error.message);
    }
    process.exitCode = 1;
    closeDatabase();
});

// Accepte aussi les navigateurs des autres machines du réseau local.
try {
    const db = getDatabase();
    const migration = await initializeDatabase(db);
    await seedTestData(db);
    app.locals.database = db;
    console.log(`SQLite : ${db.filePath}`);
    if (migration.imported) {
        console.log(`Import JSON : ${migration.users} utilisateurs, ${migration.agendas} agendas, ${migration.evenements} événement.`);
    }
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`ChronoSquad : http://localhost:${PORT}`);
        console.log(`Réseau local : http://<adresse-ip-du-serveur>:${PORT}`);
    });
} catch (error) {
    console.error("Initialisation SQLite impossible :", error.message);
    closeDatabase();
    process.exitCode = 1;
}
