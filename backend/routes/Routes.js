import { Router } from "express";
import createError from "http-errors";
import { UserRepository } from "../repositories/UserRepository.js";
import { AgendaRepository } from "../repositories/AgendaRepository.js";
import { UserController } from "../controllers/UserController.js";
import { AuthController } from "../controllers/AuthController.js";
import { AgendaController } from "../controllers/AgendaController.js";
import { EvenementController } from "../controllers/EvenementController.js";
import { requireAuth } from "../middleware/RequireAuth.js";
import { requireSameOrigin } from "../middleware/Session.js";
import { ICalendarController } from "../controllers/ICalendarController.js";

export const apiRouter = Router();

apiRouter.post("/users", requireSameOrigin, UserController.register);
apiRouter.get("/users/me", requireAuth, UserController.getCurrentUser);
apiRouter.post("/auth/login", requireSameOrigin, AuthController.login);
apiRouter.post("/auth/logout", requireSameOrigin, AuthController.logout);

apiRouter.post("/agendas/import/preview", requireSameOrigin, requireAuth, ICalendarController.preview);
apiRouter.post("/agendas/import", requireSameOrigin, requireAuth, ICalendarController.importer);
apiRouter.post("/agendas/:id/import", requireSameOrigin, requireAuth, ICalendarController.importerDansAgenda);
apiRouter.get("/agendas/:id/export", requireAuth, ICalendarController.exporter);
apiRouter.get("/agendas/export", requireAuth, ICalendarController.exporterTous);
apiRouter.get("/agendas", requireAuth, AgendaController.getAgendas);
apiRouter.get("/agendas/:id", requireAuth, AgendaController.getAgenda);
apiRouter.post("/agendas", requireSameOrigin, requireAuth, AgendaController.createAgenda);
apiRouter.put("/agendas/:id", requireSameOrigin, requireAuth, AgendaController.updateAgenda);
apiRouter.delete("/agendas/:id", requireSameOrigin, requireAuth, AgendaController.deleteAgenda);
apiRouter.get("/agendas/:id/partages", requireAuth, AgendaController.getPartages);
apiRouter.post("/agendas/:id/partages", requireSameOrigin, requireAuth, AgendaController.addPartage);
apiRouter.delete("/agendas/:id/partages/:username", requireSameOrigin, requireAuth, AgendaController.removePartage);
apiRouter.get("/evenements", requireAuth, EvenementController.getEvenements);
apiRouter.post("/agendas/:agendaId/evenements", requireSameOrigin, requireAuth, EvenementController.createEvenement);
apiRouter.post("/evenements/deplacer", requireSameOrigin, requireAuth, EvenementController.deplacerEvenements);
apiRouter.post("/evenements/dupliquer", requireSameOrigin, requireAuth, EvenementController.dupliquerEvenements);
apiRouter.put("/evenements/:id", requireSameOrigin, requireAuth, EvenementController.updateEvenement);
apiRouter.delete("/evenements/:id", requireSameOrigin, requireAuth, EvenementController.deleteEvenement);

apiRouter.get("/health", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ status: "ok" });
});
apiRouter.get(
    "/evenements/:id/occurrences",
    requireAuth,
    EvenementController.getOccurrences
);
apiRouter.put(
    "/evenements/:id/occurrences/:occurrenceStart",
    requireSameOrigin,
    requireAuth,
    EvenementController.updateOccurrence
);
apiRouter.delete(
    "/evenements/:id/occurrences/:occurrenceStart",
    requireSameOrigin,
    requireAuth,
    EvenementController.deleteOccurrence
);
apiRouter.delete(
    "/evenements/:id/occurrences/:occurrenceStart/exception",
    requireSameOrigin,
    requireAuth,
    EvenementController.restoreOccurrence
);
apiRouter.get(
    "/evenements/search",
    requireAuth,
    EvenementController.searchEvenements
);
apiRouter.use((req, res, next) => {
    next(createError(404, "Route API introuvable."));
});
