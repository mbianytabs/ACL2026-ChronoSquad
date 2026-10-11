import { Router } from "express";
import createError from "http-errors";
import { UserRepository } from "../repositories/UserRepository.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";

export const apiRouter = Router();

// Vérifie uniquement que le serveur répond, sans dépendre du métier.
apiRouter.get("/health", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ status: "ok" });
});

// Démonstration de lecture SQLite : uniquement l'utilisateur et l'agenda de test.
apiRouter.get("/test/user-agenda", async (req, res) => {
    const users = new UserRepository(req.app.locals.database);
    const agendas = new AgendaRepository(req.app.locals.database);
    const user = await users.findById("test-user");
    const agenda = await agendas.findById("test-agenda");
    if (!user || !agenda || agenda.ownerId !== user.id) {
        throw createError(404, "Données de démonstration absentes ou incohérentes. Relancez le serveur.");
    }
    res.set("Cache-Control", "no-store");
    // Express appelle User.toJSON() : passwordHash est exclu de la réponse.
    res.json({ user, agenda });
});

// Ajouter les futures routes métier AU-DESSUS de cette 404.
// Le préfixe /api est déjà fourni par app.js.
apiRouter.use((req, res, next) => {
    next(createError(404, "Route API introuvable."));
});
