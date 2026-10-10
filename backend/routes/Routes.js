import { Router } from "express";
import createError from "http-errors";

export const apiRouter = Router();

// Vérifie uniquement que le serveur répond, sans dépendre du métier.
apiRouter.get("/health", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ status: "ok" });
});

// Ajouter les futures routes métier AU-DESSUS de cette 404.
// Le préfixe /api est déjà fourni par app.js.
apiRouter.use((req, res, next) => {
    next(createError(404, "Route API introuvable."));
});
