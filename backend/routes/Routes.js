import { Router } from "express";
import createError from "http-errors";
import { UserRepository } from "../repositories/UserRepository.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { UserController } from "../controllers/UserController.js";
import { AuthController } from "../controllers/AuthController.js";
import { requireAuth } from "../middleware/RequireAuth.js";
import { requireSameOrigin } from "../middleware/Session.js";

export const apiRouter = Router();

apiRouter.post("/users", requireSameOrigin, UserController.register);
apiRouter.get("/users/me", requireAuth, UserController.getCurrentUser);
apiRouter.post("/auth/login", requireSameOrigin, AuthController.login);
apiRouter.post("/auth/logout", requireSameOrigin, AuthController.logout);

// Vérifie uniquement que le serveur répond, sans dépendre du métier.
apiRouter.get("/health", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ status: "ok" });
});

// Démonstration de lecture SQLite : uniquement l'utilisateur et l'agenda de test.
apiRouter.get("/test/user-agenda", async (req, res) => {
    const users = new UserRepository(req.app.locals.database);
    const agendas = new AgendaRepository(req.app.locals.database);
    const user = await users.findByUsername("sqlite_demo");
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
