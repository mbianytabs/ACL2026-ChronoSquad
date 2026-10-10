import { createServer } from "node:http";
import { app } from "./app.js";

// Le sujet impose un serveur unique sur le port 3000.
const PORT = 3000;
const server = createServer(app);

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Le port ${PORT} est déjà utilisé. Arrêtez l'autre serveur puis relancez npm start.`);
    } else {
        console.error("Impossible de démarrer le serveur :", error.message);
    }
    process.exitCode = 1;
});

// Accepte aussi les navigateurs des autres machines du réseau local.
server.listen(PORT, "0.0.0.0", () => {
    console.log(`ChronoSquad : http://localhost:${PORT}`);
    console.log(`Réseau local : http://<adresse-ip-du-serveur>:${PORT}`);
});
