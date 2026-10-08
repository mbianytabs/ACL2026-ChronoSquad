import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Le dossier public se trouve un niveau au-dessus de backend
const publicDir = path.join(__dirname, "..", "public");

const mimeTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
};

const server = http.createServer((request, response) => {
    let urlPath = request.url;

    // Quand on demande "/", on sert index.html
    if (urlPath === "/") {
        urlPath = "/index.html";
    }

    const filePath = path.join(publicDir, urlPath);

    fs.readFile(filePath, (error, data) => {
        if (error) {
            response.writeHead(404, {
                "Content-Type": "text/plain; charset=utf-8"
            });

            response.end("404 - Fichier non trouvé");
            return;
        }

        const extension = path.extname(filePath);
        const contentType = mimeTypes[extension] || "application/octet-stream";

        response.writeHead(200, {
            "Content-Type": contentType
        });

        response.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});