// Remplace la base locale par la copie partagée de l'équipe.
// Usage : npm run db:restore (serveur arrêté).
// L'ancienne base est conservée dans data/ sous un nom daté.
import { copyFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { seedPath } from "./SQLiteDatabase.js";

const target = fileURLToPath(new URL("../../data/chronosquad.sqlite", import.meta.url));

if (!existsSync(seedPath)) {
    console.error("Copie partagée introuvable : backend/storage/seed/chronosquad.sqlite");
    process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });

if (existsSync(target)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backup = target.replace(/\.sqlite$/, `.backup-${stamp}.sqlite`);
    renameSync(target, backup);
    console.log(`Ancienne base conservée : ${backup}`);
}

copyFileSync(seedPath, target);
console.log("Base restaurée depuis la copie partagée. Lancez npm start puis connectez-vous avec vos comptes.");
